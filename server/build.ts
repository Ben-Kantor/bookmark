import { join } from "https://deno.land/std/path/join.ts"
import { setup } from "https://esm.sh/twind"
import { virtualSheet } from "https://esm.sh/twind/sheets"
import { getStyleTag, shim } from "https://esm.sh/twind/shim/server"
import { minify } from "https://esm.sh/html-minifier-terser@7"
import { config } from "./constants.ts"
import subsetFont from "./subset-font.ts"
import { vaultMap } from "./vaultmap.ts"
import { createExplorerBuilder } from "./build-explorer.ts"

export const nerdFont: Uint8Array = await subsetNerdFont()

const bundleResult = await Deno.bundle({
  entrypoints: ["./client/src/init-client.ts"],
  minify: config.minify,
  write: false,
  platform: "browser" as Deno.bundle.Platform,
  format: "iife" as Deno.bundle.Format,
  sourcemap: config.sourceMap ? ("inline" as Deno.bundle.SourceMapType) : undefined,
})

if (!bundleResult.success) {
  console.error("Bundle errors:", bundleResult.errors)
  throw new Error("Failed to bundle client code")
}

const transpiledBundle: string = bundleResult.outputFiles[0].text()

export const buildHtmlTemplate = async (): Promise<string> => {
  console.log("Building server template...")
  const [htmlString, clientCSS, iconMap] = await Promise.all([
    Deno.readTextFile("./client/client.html"),
    loadCSS(),
    Deno.readTextFile("./assets/iconMap.json").then(JSON.parse),
  ])

  let finalCSS: string = clientCSS
  if (config.minify) {
    const cssResult = await Deno.bundle({
      entrypoints: [],
      minify: true,
      write: false,
      format: "iife",
    })
    // Note: CSS minification with Deno.bundle might require a different approach
    // You may want to use a dedicated CSS minifier instead
    finalCSS = clientCSS // Keep original for now, as Deno.bundle is primarily for JS/TS
  }

  const finalHtml: string = htmlString
    .replace(
      "<PLACEHOLDER-HEAD>",
      `<meta name="description" property="og:description" content="${config.description}">
	  <link rel="stylesheet" href="/!!/photoswipe.css">
	  <style>${finalCSS}</style>
	  ${renderWithTwind(htmlString)}
	  <script>
		window.config = ${JSON.stringify(config)}
	  </script>`,
    )
    .replace(
      "<PLACEHOLDER-JS>",
      `<script>${transpiledBundle}</script>`,
    )
    .replace("<PLACEHOLDER-TITLE>", config.title)
    .replace("<PLACEHOLDER-EXPLORER>", createExplorerBuilder(iconMap)(vaultMap.children))
    .replace("\n", config.minify ? "" : "\n")

  let outputHtml: string
  if (config.minify) {
    outputHtml = await minify(finalHtml, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: false,
      minifyJS: false,
    })
  } else {
    outputHtml = finalHtml
  }

  return outputHtml
}

const loadCSS = async (): Promise<string> => {
  const CSSFilePaths: string[] = [...Deno.readDirSync("./client/styles")]
    .map(({ name }) => join("./client/styles", name))
  const CSSContentsWithHeaders: string[] = await Promise.all(
    CSSFilePaths.map(async (filePath) => {
      return await Deno.readTextFile(filePath)
    }),
  )
  return "\n" + CSSContentsWithHeaders.join("\n")
}

export const renderWithTwind = (html: string): string => {
  const sheet = virtualSheet()
  setup({ sheet, mode: "silent" })
  sheet.reset()
  shim(html)
  shim(
    `<div class="rounded gap-2 p-1 items-start hover:text-[var(--text-accent)] font-bold active-file p-2 text-left text-[var(--accent-primary)] text-ellipsis flex items-center pl-[0.2em] icon w-6 text-center truncate expanded pl-[0.5em] block list-item toc-expanded inline-block w-[0.75em] flex-1 whitespace-nowrap overflow-hidden cursor-pointer direction: rtl clickable-header whitespace-pre-wrap break-words"></div>`,
  )
  const style: string = getStyleTag(sheet)
  return style
}

export const htmlTemplate: string = await buildHtmlTemplate()

export async function subsetNerdFont(): Promise<Uint8Array> {
  const characters = await Deno.readTextFile("assets/charList.txt")
  const fontBuffer = await fetch(
    "https://cdn.jsdelivr.net/gh/mshaugh/nerdfont-webfonts/build/fonts/FiraCodeNerdFont-Regular.woff2",
  ).then((res) => res.arrayBuffer())
  const subsetBuffer = await subsetFont(
    new Uint8Array(fontBuffer),
    characters,
    {
      targetFormat: "woff2",
    },
  )
  return subsetBuffer
}
