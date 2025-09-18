import { contentType } from 'jsr:@std/media-types@1.1.0'
import { extname, normalize } from 'jsr:@std/path@1.1.2'

import { htmlTemplate, nerdFont } from './build.ts'
import * as CONFIG from './config.ts'
import { loadFileToHTML, resolveFileRequest } from './coreutils.ts'
import { generateMap, generateOgTags, zipContent } from './lib.ts'
import { vaultMap } from './vaultmap.ts'
import { fileRequestInfo } from './types.ts'

const handler = async (request: Request): Promise<Response> => {
	const requestUrl = new URL(request.url)
	const normalizedPath = normalize(decodeURIComponent(requestUrl.pathname))
	const startTime = CONFIG.VERBOSE && performance.now()

	const sendLog = (status: 'success' | 'error', err?: unknown) => {
		if (!startTime) return
		const elapsedTime = (performance.now() - startTime).toFixed(2)
		if (status === 'success') console.log(`✅ ${elapsedTime}ms: Served ${normalizedPath}`)
		else console.error(`❌ ${elapsedTime}ms: Error serving ${normalizedPath}:`, err)
	}

	const serveFont = () => new Response(nerdFont, { headers: { 'Content-Type': 'font/woff2' } })
	const serveZip = async () =>
		new Response(await zipContent() as BodyInit, {
			headers: { 'Content-Type': 'application/zip' },
		})
	const serveMarkdown = () =>
		new Response(generateMap() as BodyInit, { headers: { 'Content-Type': 'text/markdown' } })
	const serveJSON = () =>
		new Response(JSON.stringify(vaultMap) as BodyInit, {
			headers: { 'Content-Type': 'application/json' },
		})
	const redirectIndex = () =>
		new Response(null, { status: 302, headers: { 'Location': CONFIG.INDEX_FILE } })

	const serveFile = async (filePathResult: fileRequestInfo) => {
		if (filePathResult.status === 404 && !filePathResult.filePath)
			return new Response('File not found.', { status: 404 })
		else if (filePathResult.status === 403) return new Response('Forbidden.', { status: 403 })
		else if (filePathResult.status === 500 || !filePathResult.filePath)
			throw new Error('Failure to resolve file request')
		else if (filePathResult.isLiteralRequest) {
			const file = await Deno.open(filePathResult.filePath, { read: true })
			const stat = await file.stat()
			return new Response(file.readable, {
				status: filePathResult.status || 200,
				headers: new Headers({
					'Content-Type': contentType(extname(filePathResult.filePath)) ||
						'application/octet-stream',
					'Content-Length': stat.size.toString(),
				}),
			})
		} else {
			const page = htmlTemplate
				.replace('$PLACEHOLDER-META', generateOgTags(filePathResult))
				.replace('$PLACEHOLDER-CONTENT', await loadFileToHTML(filePathResult.filePath))
			const headers: { [key: string]: string } = { 'Content-Type': 'text/html' }
			if (filePathResult.preferredAddress)
				headers['X-Redirect-URL'] = filePathResult.preferredAddress
			return new Response(page, { status: filePathResult.status || 200, headers })
		}
	}

	let response: Response
	try {
		if (normalizedPath === '/!/nerdFont.woff2') response = serveFont()
		else if (normalizedPath === '/site.zip') response = await serveZip()
		else if (normalizedPath === '/sitemap.md') response = serveMarkdown()
		else if (normalizedPath === '/sitemap.json') response = serveJSON()
		else if (normalizedPath === '/') response = redirectIndex()
		else response = await serveFile(await resolveFileRequest(normalizedPath))

		sendLog('success')
	} catch (err) {
		sendLog('error', err)
		response = new Response('Internal Server Error:\n' + String(err), { status: 500 })
	}
	return response
}

Deno.serve({ port: CONFIG.PORT }, handler)
