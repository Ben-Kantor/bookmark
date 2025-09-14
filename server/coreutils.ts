import { contentType } from 'jsr:@std/media-types@1'
import { type ParsedPath } from 'jsr:@std/path@1'
import { basename, extname, isAbsolute, join, parse, relative } from 'jsr:@std/path@1'

import { absoluteAssetsDir, absoluteContentDir, config, contentDir } from './constants.ts'
import { formatBytes, memoize, pathMatchesGlob, toHTTPLink, warn } from './lib.ts'
import { renderMarkdown } from './markdown.ts'
import * as types from './types.ts'

export const resolveFileRequest = async (
    path: string,
): Promise<types.fileRequestInfo> => {
    let absolutePath: string | undefined
    if (path.startsWith('/!!'))
        absolutePath = join(Deno.cwd(), config.paths.assetsDir, path.slice(3))
    else {absolutePath = join(
            Deno.cwd(),
            config.paths.contentDir,
            path.replace(/^\/\!/g, ''),
        )}

    const webLinkResult = handleWebLink(path)
    if (webLinkResult) return webLinkResult

    const rootResult = handleRootPath(path)
    if (rootResult) return rootResult

    const parsedPath = parse(absolutePath)

    if (
        !parsedPath.dir.startsWith(absoluteContentDir) &&
        !parsedPath.dir.startsWith(absoluteAssetsDir)
    ) {
        return { status: 403 }
    }

    const fileStat = await Deno.stat(
        absolutePath || absolutePath,
    ).catch(() => ({ isFile: false, isDirectory: false }))

    // Check for existing file
    const fileResult = handleExistingFile(
        fileStat,
        parsedPath,
        path,
        absolutePath,
    )
    if (fileResult) return fileResult

    // Check for directory
    const directoryResult = await handleDirectory(
        fileStat,
        parsedPath,
        path,
        absolutePath,
    )
    if (directoryResult) return directoryResult

    // Try to find file by prefix
    const prefixResult = await findFileByPrefix(parsedPath, path, absolutePath)
    if (prefixResult) return prefixResult

    // Default to 404
    return handle404()
}

const determineRenderingType = (filePath: string): string | undefined => {
    const renderOverrides: Record<string, string[]> = config.renderOverrides

    // Check render overrides first
    for (const [type, patterns] of Object.entries(renderOverrides)) {
        for (let pattern of patterns) {
            if (!isAbsolute(pattern)) pattern = join(contentDir, pattern)
            if (pathMatchesGlob(filePath, pattern)) return type
        }
    }

    // Fall back to extension-based detection
    const ext = extname(filePath).toLowerCase()
    if (ext === '.md') return 'markdown'
    if (['.html', '.htm', '.xhtml', '.pdf'].includes(ext)) return 'iframe'
    if (
        ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.apng']
            .includes(ext)
    ) { return 'image' }
    if (['.mp4', '.webm', '.mov', '.av1'].includes(ext)) return 'video'
    if (['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.flac'].includes(ext))
        return 'audio'
    if (ext === '.txt') return 'plaintext'

    return undefined
}

const readFileContent = async (filePath: string): Promise<string> => {
    const textContent: string | void = await Deno.readTextFile(filePath).catch(
        (err) => warn(err.toString()),
    )
    return textContent || '<i>Empty File</i>'
}

const detectBinaryContent = (textContent: string): boolean => textContent.includes('\u0000')

const renderContent = async (
    renderingType: string,
    textContent: string,
    filePath: string,
    isEmbed?: boolean,
): Promise<string> => {
    const fileExt: string = extname(filePath).toLowerCase()
    const fileBaseName: string = basename(filePath, fileExt)
    const relativePath: string = relative(contentDir, filePath)

    switch (renderingType) {
        case 'markdown':
            return await renderMarkdown(
                textContent,
                filePath,
                isEmbed,
                !isEmbed,
            )

        case 'plaintext':
            return `<pre class="whitespace-pre-wrap break-words">${textContent.trimEnd()}</pre>`

        case 'codeblock':
            return await renderMarkdown(
                '```' +
                    (extname(filePath).substring(1) || 'plaintext') +
                    '\n' +
                    textContent.trimEnd() +
                    '\n' +
                    '`',
                filePath,
                isEmbed,
            )

        case 'image':
            return `<div class="relative h-full bg-gray-200">
<img src="/!/${relativePath}" data-pswp-src="/!/${relativePath}" class="max-w-full h-auto block lightbox-image">
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
            return `<iframe src="/!/${relativePath}" class="w-full h-full border-none"></iframe>`

        case 'download':
            return await renderDownloadContent(
                filePath,
                fileBaseName,
                relativePath,
            )

        default:
            return `<p>Unsupported file type for ${basename(filePath)}.</p>`
    }
}

const renderDownloadContent = async (
    filePath: string,
    fileBaseName: string,
    relativePath: string,
): Promise<string> => {
    try {
        const fileInfo = await Deno.stat(filePath)
        const fileExt = extname(filePath).toLowerCase()
        return `<div class="flex flex-col p-4 items-center text-center">
			<h2 class="text-xl font-bold">${fileBaseName}</h2>
			<p class="mt-2">Media type: <i style="color: var(--accent-gold)">
				${contentType(fileExt) || 'unknown'}
			</i></p>
			<p class="mt-1">File size: <strong class="font-bold">${
            formatBytes(
                fileInfo.size,
            )
        }</strong></p>
			<a href="/!/${relativePath}" download="${basename(filePath)}"
				style="color: var(--layer-0)" class="download-button mt-4 px-6 py-2 font-semibold rounded-lg shadow-md">Download File</a>
			</div>`
    } catch (err) {
        console.error(`Could not stat file ${filePath}:`, err)
        return `<h1 class="text-2xl font-bold">Error</h1>
<p class="mt-2">Could not load file information for ${basename(filePath)}.</p>`
    }
}

export const loadFileToHTML_ = async (
    filePath: string,
    isEmbed?: boolean,
): Promise<string> => {
    let renderingType = determineRenderingType(filePath)
    const textContent = await readFileContent(filePath)

    if (!renderingType)
        renderingType = detectBinaryContent(textContent) ? 'download' : 'codeblock'

    return await renderContent(renderingType, textContent, filePath, isEmbed)
}

export const loadFileToHTML = memoize(loadFileToHTML_, 20000)

const handleWebLink = (path: string): types.fileRequestInfo | null => {
    const webLink: string | null = toHTTPLink(path)
    if (webLink) {
        return {
            filePath: webLink,
            isWebLink: true,
        }
    }
    return null
}

const handleRootPath = (path: string): types.fileRequestInfo | null => {
    if (path === '/' || !path) {
        return {
            filePath: join(contentDir, config.paths.indexFile),
            preferredAddress: config.paths.indexFile.replace('.', ''),
        }
    }
    return null
}

const handleExistingFile = (
    fileStat: Deno.FileInfo | { isFile: boolean; isDirectory: boolean },
    parsedPath: ParsedPath,
    path: string,
    absolutePath?: string,
): types.fileRequestInfo | null => {
    if (fileStat.isFile) {
        const filePath = absolutePath || parsedPath.dir + '/' + parsedPath.base
        return {
            filePath: filePath,
            isLiteralRequest: path.includes('/!'),
            preferredAddress: '/' + relative(contentDir, filePath),
        }
    }
    return null
}

const handleDirectory = async (
    fileStat: Deno.FileInfo | { isFile: boolean; isDirectory: boolean },
    parsedPath: ParsedPath,
    path: string,
    absolutePath?: string,
): Promise<types.fileRequestInfo | null> => {
    if (fileStat.isDirectory) {
        const dirPath = absolutePath || parsedPath.dir
        const possibleFiles = Deno.readDir(dirPath)
        let firstFile: Deno.DirEntry | undefined

        for await (const entry of possibleFiles) {
            if (!firstFile) firstFile = entry
            if (!entry.isFile) continue
            if (entry.name.toLowerCase().split('.')[0] === 'index') {
                const filePath = join(dirPath, entry.name)
                return {
                    filePath: filePath,
                    isLiteralRequest: path.includes('/!'),
                    preferredAddress: '/' + relative(contentDir, filePath),
                }
            }
        }

        if (!firstFile) {
            const filePath = join(dirPath, parsedPath.base)
            return {
                filePath: filePath,
                isLiteralRequest: path.includes('/!'),
                preferredAddress: '/' + relative(contentDir, filePath),
            }
        }

        // Return the first file in the directory
        const filePath = join(dirPath, firstFile.name)
        return {
            filePath: filePath,
            isLiteralRequest: path.includes('/!'),
            preferredAddress: '/' +
                relative(contentDir, parsedPath.dir + '/' + parsedPath.base),
        }
    }
    return null
}

const findFileByPrefix = async (
    parsedPath: ParsedPath,
    path: string,
    absolutePath?: string,
): Promise<types.fileRequestInfo | null> => {
    try {
        const dirPath = absolutePath ? parse(absolutePath).dir : parsedPath.dir
        const possibleFiles = Deno.readDir(dirPath)
        const requestFileName: string = parsedPath.name
            .toLowerCase()
            .split('.')[0]

        for await (const entry of possibleFiles) {
            if (!entry.isFile) continue
            if (entry.name.toLowerCase().startsWith(requestFileName)) {
                const filePath = join(dirPath, entry.name)
                return {
                    filePath: filePath,
                    isLiteralRequest: path.includes('/!'),
                    preferredAddress: '/' + relative(contentDir, filePath),
                }
            }
        }
    } catch {
        // Resort to 404
    }
    return null
}

const handle404 = (): types.fileRequestInfo => {
    return {
        filePath: join(contentDir, '.404.md'),
        status: 404,
    }
}
