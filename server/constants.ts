import { resolve } from "https://deno.land/std/path/resolve.ts"
import { SiteConfig } from "./types.ts"


export const config: SiteConfig = {
	port: 8000,
	minify: false,
	sourceMap: false,
	sanitize: false,
	paths: {
		contentDir: "./content/",
		assetsDir: "./assets/",
		indexFile: "./index.md"
	},

	title: "Bookmark",
	description: "A dynamic markdown webserver and file explorer",

	renderOverrides: {
		"iframe": [],
		"codeblock": ["./**.html"]
	},
	logWarnings: true
}

export const PORT: number = parseInt(Deno.env.get("PORT") ?? config.port.toString())
export const contentDir: string = resolve(config.paths.contentDir)
export const absoluteContentDir: string = resolve(Deno.cwd(), config.paths.contentDir)
export const absoluteAssetsDir: string = resolve(Deno.cwd(), config.paths.assetsDir)
