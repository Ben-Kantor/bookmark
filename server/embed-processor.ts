import { join, dirname, basename, extname } from 'https://deno.land/std/path/mod.ts'
import { loadFileToHTML } from './coreutils.ts'
import { fileExists, findFilePath, vaultMap } from './vaultmap.ts'
import { toTitleCase, toHTTPLink, escapeHTML } from './lib.ts'
import { yellow } from 'jsr:@std/fmt@0.223/colors'
import { renderMarkdown } from './markdown.ts'
import { extractEmbedProperties, createEmbedWithProperties, splitHtmlWrappers, addLineNumbers } from './embed-utils.ts'
import { config } from './constants.ts'

export const processEmbed = async (
	doubleBracketTerm: string | undefined,
	bracketTerm: string | undefined,
	parenthesesTerm: string | undefined,
	currentPath: string,
	contentDir: string
): Promise<string> => {
	let mutableBracketTerm = bracketTerm
	if (mutableBracketTerm?.startsWith('<') && mutableBracketTerm.endsWith('>')) {
		mutableBracketTerm = mutableBracketTerm.slice(1, -1)
	}

	const linkSource = doubleBracketTerm || parenthesesTerm || mutableBracketTerm
	const rawLinkTarget = linkSource?.split(/[|#]/)[0]
	let displayText =
		(doubleBracketTerm
			? doubleBracketTerm.split(/[|#]/)[0] || rawLinkTarget
			: mutableBracketTerm || rawLinkTarget) || 'Embedded Content'

	if (displayText.includes('://')) {
		displayText = toTitleCase(
			basename(decodeURIComponent(displayText.split(/[\|\#]/)[0]))
				.split('.')[0]
				.replace(/[\_\-]/g, ' ')
		)
	}

	if (!rawLinkTarget) {
		return `<md-embed role='group' title='Error: Missing or malformed embed</p>'>![${doubleBracketTerm||bracketTerm||parenthesesTerm}]</md-embed>`
	}

	const httpLink = toHTTPLink(rawLinkTarget)
	if (httpLink) {
		return await processHttpEmbed(httpLink, linkSource || '', displayText)
	}

	const targetPathFromContentDir = resolveTargetPath(doubleBracketTerm, rawLinkTarget, currentPath)

	if (!targetPathFromContentDir && !httpLink) {
		console.warn(
			yellow(`Missing or malformed embed ![[${rawLinkTarget}]] in /${currentPath}`)
		)
		return `<md-embed role='group' title='Error: Missing or malformed embed</p>'>![${doubleBracketTerm||bracketTerm||parenthesesTerm}]</md-embed>`
	}

	return await processFileEmbed(
		targetPathFromContentDir,
		httpLink,
		linkSource || '',
		displayText,
		contentDir
	)
}

const processHttpEmbed = async (
	httpLink: string,
	linkSource: string,
	displayText: string
): Promise<string> => {
	const properties = extractEmbedProperties(linkSource)
	const url = new URL(httpLink)
	const hostname = url.hostname.toLowerCase()

	if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
		const videoId = hostname.includes('youtu.be')
			? url.pathname.slice(1)
			: url.searchParams.get('v')
		const iframe = `<iframe title="${escapeHTML(displayText)}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" style="padding:0px" allowfullscreen></iframe>`

		if (httpLink === displayText && !properties.title) {
			properties.noTitle = true
		}
		return createEmbedWithProperties(iframe, displayText, properties)
	}

	if (hostname.includes('vimeo.com')) {
		const videoId = url.pathname.split('/').pop()
		const iframe = `<iframe title="${escapeHTML(displayText)}" src="https://player.vimeo.com/video/${videoId}" frameborder="0" style="padding:0px" allowfullscreen></iframe>`

		if (httpLink === displayText && !properties.title) {
			properties.noTitle = true
		}
		return createEmbedWithProperties(iframe, displayText, properties)
	}

	try {
		let res = await fetch(httpLink, { method: 'HEAD' })
		if (!res.ok || !res.headers.has('content-type')) {
			res = await fetch(httpLink, { method: 'GET' })
		}
		const mime = res.headers.get('content-type')?.split(';')[0].trim() || ''
		const majorType = mime.split('/')[0]
		const ext = extname(httpLink)
		const rawProperties = extractEmbedProperties(linkSource)

		if (majorType === 'image') {
			const img = `<img src="${httpLink}" alt="${displayText}" style="padding:0px" class="lightbox-image"/>`
			return createEmbedWithProperties(img, displayText, rawProperties)
		}

		if (majorType === 'video') {
			const video = `<video controls title="${escapeHTML(displayText)}" style="padding:0px">
		<source src="${httpLink}" type="${mime || 'video/mp4'}">
		Your browser does not support the video tag.
		</video>`
			return createEmbedWithProperties(video, displayText, rawProperties)
		}

		if (majorType === 'audio') {
			const audio = `<audio controls title="${escapeHTML(displayText)}" style="padding:0px">
		<source src="${httpLink}" type="${mime || 'audio/mpeg'}">
		Your browser does not support the audio tag.
		</audio>`
			return createEmbedWithProperties(audio, displayText, rawProperties)
		}

		if (mime === 'application/pdf') {
			const iframe = `<iframe title="${escapeHTML(displayText)}" src="${httpLink}" type="application/pdf" style="padding:0px"></iframe>`
			return createEmbedWithProperties(iframe, displayText, rawProperties)
		}

		if (mime === 'text/markdown'|| mime === 'text/x-markdown' || ext === '.md' || ext === '.markdown') {
			const textContent = await (await fetch(httpLink)).text()
			let rendered = await renderMarkdown(textContent, httpLink, false, true)
			rendered = `<div class="embed-wrapper">${rendered}</div>`
			return createEmbedWithProperties(rendered, displayText, rawProperties)
		}

		if (mime === 'text/plain' && (!ext || ext === '.txt')) {
			const textContent = await (await fetch(httpLink)).text()
			const pre = `<pre class="whitespace-pre-wrap break-words">${textContent}</pre>`
			return createEmbedWithProperties(pre, displayText, rawProperties)
		}

		if (mime === 'text/html') {
			const iframe = `<iframe title="${escapeHTML(displayText)}" src="${httpLink}" frameborder="0" style="padding:0px"></iframe>`
			return createEmbedWithProperties(iframe, displayText, rawProperties)
		}

		try {
			let textContent = await (await fetch(httpLink)).text()
			if(rawProperties.numbered) textContent = addLineNumbers(textContent)
			const codeblock = await renderMarkdown('```' + ext.slice(1) + '\n' + textContent + '\n```', httpLink, false, false)
			return createEmbedWithProperties(codeblock, displayText, rawProperties)
		} catch {
			return createEmbedWithProperties(httpLink, "Error Loading Content", rawProperties)
		}
	} catch (err) {
		console.warn(yellow(`Error processing embed: ${err}`))
		return createEmbedWithProperties(httpLink, "Error Loading Content", {})
	}
}

const resolveTargetPath = (
	doubleBracketTerm: string | undefined,
	rawLinkTarget: string,
	currentPath: string
): string | undefined => {
	if (doubleBracketTerm) {
		const term = doubleBracketTerm.split(/[|#]/)[0]
		if (term.includes('.')) {
			const parts = term.split('.')
			return findFilePath(vaultMap, parts[0], `.${parts[1]}`)
		}
		return findFilePath(vaultMap, term, '.md') || findFilePath(vaultMap, term)
	}

	const prospectivePath = join(dirname(currentPath), rawLinkTarget)
	if (fileExists(join(config.paths.contentDir || '', prospectivePath))) {
		return prospectivePath
	}

	const base = basename(rawLinkTarget, extname(rawLinkTarget))
	const ext = extname(rawLinkTarget)
	return findFilePath(vaultMap, base, ext)
}

const processFileEmbed = async (
	targetPathFromContentDir: string | undefined,
	httpLink: string | null,
	linkSource: string,
	displayText: string,
	contentDir: string
): Promise<string> => {
	try {
		const fullPathToEmbed = !httpLink ? join(contentDir, targetPathFromContentDir || '') : ''
		const properties = extractEmbedProperties(linkSource)
		let embeddedHTML: string

		if (httpLink) {
			const response = await fetch(httpLink)
			const text = await response.text()
			embeddedHTML = httpLink.endsWith('.md')
				? await renderMarkdown(text, httpLink, true)
				: await renderMarkdown('```' + text + '```', httpLink, true)
		} else {
			embeddedHTML = (await loadFileToHTML(fullPathToEmbed, true)).trim()
		}

		if (!splitHtmlWrappers(embeddedHTML)[0]) {
			embeddedHTML = `<div class="embed-wrapper">${embeddedHTML}</div>`
		}

		return createEmbedWithProperties(embeddedHTML, displayText, properties, targetPathFromContentDir)
	} catch (error) {
		console.error(`Error loading embed ${linkSource}:`, error)
		return `<md-embed role="group" aria-label="Error embedding content: ${linkSource}" title="Error"><p>Error: ${error}</p></md-embed>`
	}
}