import { normalize, basename, extname } from "https://deno.land/std@0.224.0/path/mod.ts"
import { contentType } from "https://deno.land/std@0.224.0/media_types/mod.ts"
import { pathMatches, zipContent } from "./lib.ts"
import { loadFileToHTML, resolveFileRequest } from "./coreutils.ts"
import { config, PORT } from "./constants.ts"
import { htmlTemplate } from "./build.ts"
import { join } from "https://deno.land/std@0.224.0/path/join.ts"

const handler = async (request: Request): Promise<Response> => {
	const requestUrl = new URL(request.url)
	const normalizedPath = normalize(decodeURIComponent(requestUrl.pathname))

	if (normalizedPath === "/site.zip") {
		return new Response(await zipContent(), { 
			headers: { "Content-Type": "application/zip" } 
		})
	}
	
	if (config.paths.whitelist.findIndex((path: string) => pathMatches(normalizedPath, path)) > -1) {
		const filePath = join(Deno.cwd(), normalizedPath)
		
		try {
			const file = await Deno.open(filePath, { read: true })
			const stat = await file.stat()
			const headers = new Headers({
				"Content-Type": contentType(extname(filePath)) || "application/octet-stream",
				"Content-Length": stat.size.toString(),
				"X-Redirect-URL": request.url
			})
			return new Response(file.readable, { status: 200, headers })
		} catch {
			console.warn(`Whitelisted file not found: ${filePath}`)
			return new Response("File not found.", { status: 404 })
		}
	}

	try {
		const filePathResult = await resolveFileRequest(normalizedPath)
		
		if (filePathResult.isLiteralRequest) {
			const file = await Deno.open(filePathResult.filePath, { read: true })
			const stat = await file.stat()
			const headers = new Headers({
				"Content-Type": contentType(extname(filePathResult.filePath)) || "application/octet-stream",
				"Content-Length": stat.size.toString(),
			})
			return new Response(file.readable, { 
				status: filePathResult.isNotFound ? 404 : 200, 
				headers 
			})
		}

		const htmlContent = await loadFileToHTML(filePathResult.filePath)
		const page = htmlTemplate
			.replace("$PLACEHOLDER-CONTENT", htmlContent)
			.replace("/$PLACEHOLDER-PATH/", filePathResult.preferredAddress || basename(request.url))
		
		return new Response(page, { 
			status: filePathResult.isNotFound ? 404 : 200, 
			headers: { 
				"Content-Type": "text/html", 
				"X-Redirect-URL": filePathResult.preferredAddress || request.url
			} 
		})
	} catch (err) {
		console.warn(`Error loading ${normalizedPath}:`, err)
		return new Response("<h1>Internal Server Error</h1>", { status: 500 })
	}
}

Deno.serve({ port: PORT }, handler)