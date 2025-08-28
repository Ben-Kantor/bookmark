import { normalize, basename, extname } from "https://deno.land/std@0.224.0/path/mod.ts"
import { contentType } from "https://deno.land/std@0.224.0/media_types/mod.ts"
import { generateOgTags, zipContent } from "./lib.ts"
import { loadFileToHTML, resolveFileRequest } from "./coreutils.ts"
import { PORT } from "./constants.ts"
import { htmlTemplate } from "./build.ts"

const handler = async (request: Request): Promise<Response> => { try {
	const requestUrl = new URL(request.url)
	const normalizedPath = normalize(decodeURIComponent(requestUrl.pathname))

	if (normalizedPath === "/site.zip") {
		return new Response(await zipContent(), { 
			headers: { "Content-Type": "application/zip" } 
		})
	}

	const filePathResult = await resolveFileRequest(normalizedPath)

	if (filePathResult.status === 404 && !filePathResult.filePath) return new Response("File not found.", { status: 404 })
	else if (filePathResult.status === 403) return new Response("Forbidden.", { status: 403 })
	else if (filePathResult.status === 500 || !filePathResult.filePath) throw new Error("Failure to resolve file request")

	if (filePathResult.isLiteralRequest) {
		const file = await Deno.open(filePathResult.filePath, { read: true })
		const stat = await file.stat()
		const headers = new Headers({
			"Content-Type": contentType(extname(filePathResult.filePath)) || "application/octet-stream",
			"Content-Length": stat.size.toString(),
		})
		return new Response(file.readable, { 
			status: filePathResult.status || 200,
			headers 
		})
	}

	const htmlContent = await loadFileToHTML(filePathResult.filePath)
	const page = htmlTemplate
		.replace("/$PLACEHOLDER-PATH/", filePathResult.preferredAddress || basename(request.url))
		.replace("<PLACEHOLDER-META/>", generateOgTags(filePathResult))
		.replace("$PLACEHOLDER-CONTENT", htmlContent)
	
	const headers: { [key: string]: string } = { "Content-Type": "text/html" } 
	if(filePathResult.preferredAddress ) headers['X-Redirect-URL'] = filePathResult.preferredAddress
	
	return new Response(page, { 
		status: filePathResult.status || 200,
		headers
	})
	} catch (err) {
		console.error(String(err))
		return new Response("Internal Server Error:\n" + String(err), { status: 500 })
	}
}

Deno.serve({ port: PORT }, handler)