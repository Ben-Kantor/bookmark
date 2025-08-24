import {
	basename,
	extname,
	parse,
	relative,
	isAbsolute,
	join,
} from 'https://deno.land/std@0.224.0/path/mod.ts'
import { config, contentDir } from './constants.ts'
import { renderMarkdown } from './markdown.ts'
import { formatBytes, memoize, pathMatches, toHTTPLink } from './lib.ts'
import { contentType } from 'https://deno.land/std@0.224.0/media_types/mod.ts'
import * as types from './types.ts'
import { yellow } from "jsr:@std/fmt@0.223/colors";

export const loadFileToHTML = memoize(
	async (filePath: string, isEmbed?: boolean): Promise<string> => {
		let renderingType: string | undefined
		const renderOverrides: Record<string, string[]> = config.renderOverrides

		for (const [type, patterns] of Object.entries(renderOverrides)) {
			for (let pattern of patterns) {
				if (!isAbsolute(pattern)) pattern = join(contentDir, pattern)
				if (pathMatches(filePath, pattern)) renderingType = type
			}
		}

		if (!renderingType) {
			const ext = extname(filePath).toLowerCase()
			if (ext === '.md')
				renderingType = 'markdown'
			else if (['.html', '.htm', '.xhtml', '.pdf'].includes(ext))
				renderingType = 'iframe'
			else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico','.apng',].includes(ext))
				renderingType = 'image'
			else if (['.mp4', '.webm', '.mov', '.av1'].includes(ext))
				renderingType = 'video'
			else if (['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.flac'].includes(ext))
				renderingType = 'audio'
			else if (ext === '.txt')
				renderingType = 'plaintext'
			//else if (['.tex', '.latex'].includes(ext)) renderingType = 'latex'
		}

		let textContent: string | void = await Deno.readTextFile(filePath).catch(err=>console.warn(yellow(err)))
		
		if(!textContent) textContent = 'File not found.'

		if (!renderingType) {
			renderingType = textContent.includes('\u0000')
				? 'download'
				: 'codeblock'
		}

		const fileExt: string = extname(filePath).toLowerCase()
		const fileBaseName: string = basename(filePath, fileExt)
		const relativePath: string = relative(contentDir, filePath)

		switch (renderingType) {
			case 'markdown':
				return await renderMarkdown(
					textContent,
					filePath,
					isEmbed,
					!isEmbed
				)

			case 'plaintext':
				return `<pre class="whitespace-pre-wrap break-words">${textContent.trimEnd()}</pre>`

			case 'codeblock':
				return await renderMarkdown(
					'```' +
						(extname(filePath).substring(1) || 'plaintext') +
						'\n' +
						textContent.trimEnd() +
						'\n```',
					filePath,
					isEmbed
				)

			case 'pdf':
				return `<iframe src="/!/${relativePath}" class="w-full h-full border-none" title="PDF Preview"></iframe>`

			case 'image':
				return `<div class="relative h-full bg-gray-200">
	<img src="/!/${relativePath}" data-pswp-src="/!/${relativePath}" class="max-w-full h-auto block p-0 lightbox-image">
</div>`

			case 'literal':
				return textContent

			case 'video':
				return `<video controls class="max-w-full h-auto block">
	<source src="/!/${relativePath}" type="${contentType(fileExt) || 'video/mp4'}">
</video>`

			case 'audio':
				return `<audio controls class="w-full">
	<source src="/!/${relativePath}" type="${contentType(fileExt) || 'audio/mpeg'}">
</audio>`

			case 'iframe':
				return `<iframe src="/!/${relativePath}" class="w-full h-full border-none"
				title="Embedded content for ${basename(filePath)}"></iframe>`

			case 'download':
				try {
					const fileInfo = await Deno.stat(filePath)
					return `<div class="flex flex-col p-4 items-center text-center">
						<h2 class="text-xl font-bold">${fileBaseName}</h2>
						<p class="mt-2">Media type: <i style="color: var(--accent-gold)">
							${contentType(fileExt) || 'unknown'}
						</i></p>
						<p class="mt-1">File size: <strong class="font-bold">${formatBytes(fileInfo.size)}</strong></p>
						<a href="/!/${relativePath}" download="${basename(filePath)}"
							style="color: var(--layer-0)" class="download-button mt-4 px-6 py-2 font-semibold rounded-lg shadow-md">Download File</a>
						</div>`
				} catch (err) {
					console.error(`Could not stat file ${filePath}:`, err)
					return `<h1 class="text-2xl font-bold">Error</h1>
<p class="mt-2">Could not load file information for ${basename(filePath)}.</p>`
				}
			default:
				return `<p>Unsupported file type for ${basename(filePath)}.</p>`
		}
	}
) as (filePath: string, noEmbeds?: boolean) => Promise<string>

export async function resolveFileRequest(
	path: string
): Promise<types.fileRequestInfo> {
	const webLink: string | null = toHTTPLink(path)
	if (webLink) {
		return {
			filePath: webLink,
			isLiteralRequest: false,
			preferredAddress: undefined,
			isWebLink: true,
		}
	}

	const normalizedPath: string = path.replace('/!', '')
	const parsedPath = parse(contentDir + normalizedPath)

	if (path === '/' || !path) {
		return {
			filePath: join(contentDir, config.paths.indexFile),
			isLiteralRequest: false,
			preferredAddress: config.paths.indexFile.replace(".", ""),
		}
	}

	const literalPath = await Deno.stat(contentDir + normalizedPath).catch(
		() => ({ isFile: false })
	)
	if (literalPath.isFile) {
		return {
			filePath: parsedPath.dir + '/' + parsedPath.base,
			isLiteralRequest: path.includes('/!'),
			preferredAddress:
				'/' + relative(contentDir, parsedPath.dir + '/' + parsedPath.base),
		}
	}

	try {
		const possibleFiles = Deno.readDir(parsedPath.dir)
		const requestFileName: string = parsedPath.name
			.toLowerCase()
			.split('.')[0]

		for await (const entry of possibleFiles) {
			if (!entry.isFile) continue
			if (entry.name.toLowerCase().startsWith(requestFileName)) {
				return {
					filePath: parsedPath.dir + '/' + entry.name,
					isLiteralRequest: path.includes('/!'),
					preferredAddress:
						'/' + relative(contentDir, parsedPath.dir + '/' + entry.name),
				}
			}
		}
	} catch {
		return {
			filePath: contentDir + '/.404.md',
			isNotFound: true,
			isLiteralRequest: false,
		}
	}

	return {
		filePath: contentDir + '/.404.md',
		isNotFound: true,
		isLiteralRequest: false,
	}
}
