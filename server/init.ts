import { contentType } from 'jsr:@std/media-types@1'
import { extname, normalize } from 'jsr:@std/path@1'

import { htmlTemplate, nerdFont } from './build.ts'
import * as CONFIG from './config.ts'
import { loadFileToHTML, resolveFileRequest } from './coreutils.ts'
import { generateMap, generateOgTags, zipContent } from './lib.ts'
import { vaultMap } from './vaultmap.ts'

const handler = async (request: Request): Promise<Response> => {
	const requestUrl = new URL(request.url)
	const normalizedPath = normalize(decodeURIComponent(requestUrl.pathname))

	const startTime = CONFIG.VERBOSE && performance.now()

	try {
		let response: Response

		if (normalizedPath === '/nerdFont.woff2') {
			response = new Response(nerdFont, {
				headers: { 'Content-Type': 'font/woff2' },
			})
		} else if (normalizedPath === '/site.zip') {
			const zipData = await zipContent()
			response = new Response(zipData as BodyInit, {
				headers: { 'Content-Type': 'application/zip' },
			})
		} else if (normalizedPath === '/sitemap.md') {
			response = new Response(generateMap() as BodyInit, {
				headers: { 'Content-Type': 'text/markdown' },
			})
		} else if (normalizedPath === '/sitemap.json'){
			response = new Response(JSON.stringify(vaultMap) as BodyInit, {
				headers: { 'Content-Type': 'application/json' },
			})
		}
		 if (normalizedPath === '/') {
			response = new Response(null, {
				status: 302,
				headers: { 'Location': CONFIG.INDEX_FILE },
			})
		} else {
			const filePathResult = await resolveFileRequest(normalizedPath)

			if (filePathResult.status === 404 && !filePathResult.filePath)
				response = new Response('File not found.', { status: 404 })
			else if (filePathResult.status === 403)
				response = new Response('Forbidden.', { status: 403 })
			else if (filePathResult.status === 500 || !filePathResult.filePath)
				throw new Error('Failure to resolve file request')
			else if (filePathResult.isLiteralRequest) {
				const file = await Deno.open(filePathResult.filePath, { read: true })
				const stat = await file.stat()
				const headers = new Headers({
					'Content-Type': contentType(extname(filePathResult.filePath)) ||
						'application/octet-stream',
					'Content-Length': stat.size.toString(),
				})
				response = new Response(file.readable, {
					status: filePathResult.status || 200,
					headers,
				})
			} else {
				const htmlContent = await loadFileToHTML(filePathResult.filePath)
				const page = htmlTemplate
					.replace('$PLACEHOLDER-META', generateOgTags(filePathResult))
					.replace('$PLACEHOLDER-CONTENT', htmlContent)

				const headers: { [key: string]: string } = { 'Content-Type': 'text/html' }
				if (filePathResult.preferredAddress)
					headers['X-Redirect-URL'] = filePathResult.preferredAddress

				response = new Response(page, {
					status: filePathResult.status || 200,
					headers,
				})
			}
		}
		if (startTime) {
			const elapsedTime = (performance.now() - startTime).toFixed(2)
			console.log(`✅ ${elapsedTime}ms: Served ${normalizedPath}`)
		}
		return response
	} catch (err) {
		if (startTime) {
			const elapsedTime = (performance.now() - startTime).toFixed(2)
			console.error(`❌ ${elapsedTime}ms: Error serving ${normalizedPath}:`, err)
		}
		return new Response('Internal Server Error:\n' + String(err), { status: 500 })
	}
}

Deno.serve({ port: CONFIG.PORT }, handler)
