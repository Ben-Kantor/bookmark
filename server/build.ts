import { config } from "../server/constants.ts"
import { vaultMap } from "../server/vaultmap.ts"
import * as esbuild from "https://deno.land/x/esbuild@v0.21.4/mod.js"
import { join } from "https://deno.land/std@0.224.0/path/join.ts"
import { minify } from "npm:html-minifier-terser@7.2.0"
import { setup } from "npm:twind@0.16.19"
import { virtualSheet } from "npm:twind@0.16.19/sheets"
import { getStyleTag, shim } from "npm:twind@0.16.19/shim/server"

const result = await esbuild.build({
  entryPoints: ["./client/src/init-client.ts"],
  bundle: true,
  minify: config.minify,
  write: false,
  target: ["es2020"],
  sourcemap: config.sourceMap ? "inline" : false
})
const transpiledBundle: string = result.outputFiles[0].text

export async function buildHtmlTemplate(): Promise<string> {
  ("Building server template...")
  const [htmlString, clientCSS, iconMap] = await Promise.all([
	Deno.readTextFile("./client/client.html"),
	loadCSS(),
	Deno.readTextFile("./assets/iconMap.json").then(JSON.parse)
  ])

  let finalCSS: string = clientCSS
  if (config.minify) {
	const cssResult = await esbuild.build({
	  stdin: {
		contents: clientCSS,
		loader: "css"
	  },
	  bundle: false,
	  minify: true,
	  write: false
	})
	finalCSS = cssResult.outputFiles[0].text
  }

  const finalHtml: string = htmlString
	.replace(
	  "<PLACEHOLDER-HEAD/>",
	  `<meta name="description" property="og:description" content="${config.description}">
	  <link rel="stylesheet" href="/assets/photoswipe.css">
	  <style>${finalCSS}</style>
	  ${renderWithTwind(htmlString)}
	  <script>
		window.config = ${JSON.stringify(config)}
		const vaultMap = ${JSON.stringify(vaultMap)}
		const fileTypeIcons = ${JSON.stringify(iconMap)}
	  </script>`
	)
	.replace(
	  "<PLACEHOLDER-JS/>",
	  `<script>${transpiledBundle}</script>`
	)
	.replace("<PLACEHOLDER-TITLE>", config.title)
	.replace("\n", config.minify ? "" : "\n")

  let outputHtml: string
  if (config.minify) {
	outputHtml = await minify(finalHtml, {
		collapseWhitespace: true,
		removeComments: true,
		minifyCSS: false,
		minifyJS: false
	})
  } else {
	outputHtml = finalHtml
  }

  return outputHtml
}

export const htmlTemplate: string = await buildHtmlTemplate()
esbuild.stop()

async function loadCSS(): Promise<string> {
  const CSSFilePaths: string[] =
	[...Deno.readDirSync("./client/styles")]
	  .map(({ name }) => join("./client/styles", name))
  
  const CSSContentsWithHeaders: string[] =
	await Promise.all(
	  CSSFilePaths.map(async filePath => {
		const fileName: string = filePath.split("/").pop() ?? "unknown.css"
		const content: string = await Deno.readTextFile(filePath)
		return config.minify
		  ? content
		  : `/* ====> ${fileName} <==== */\n ${content}`
	  })
	)
  
  return CSSContentsWithHeaders.join("\n")
}

export function renderWithTwind(html: string): string {
	const sheet = virtualSheet()
	setup({ sheet, mode: "silent" })
	sheet.reset()
	shim(html)
	shim(`<div class="rounded gap-2 p-1 items-start hover:text-[var(--text-accent)] font-bold active-file p-2 text-left text-[var(--accent-primary)] text-ellipsis flex items-center pl-[0.2em] icon w-6 text-center truncate expanded pl-[0.5em] block list-item toc-expanded inline-block w-[0.75em] flex-1 whitespace-nowrap overflow-hidden cursor-pointer direction: rtl clickable-header whitespace-pre-wrap break-words"></div>`)
	const style: string = getStyleTag(sheet)
	return style
}