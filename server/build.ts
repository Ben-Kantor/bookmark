import { join } from 'jsr:@std/path@1'
import { minify } from 'npm:html-minifier-terser@7'
import { config } from './constants.ts'
import subsetFont from './subset-font.ts'
import { vaultMap } from './vaultmap.ts'
import { createExplorerBuilder } from './build-explorer.ts'

const tasks = {
	bundle: Deno.bundle({
		entrypoints: ['./client/src/init-client.ts'],
		minify: config.minify,
		write: false,
		platform: 'browser' as Deno.bundle.Platform,
		format: 'iife' as Deno.bundle.Format,
		sourcemap: config.sourceMap ? ('inline') : undefined,
	}),

	font: Promise.all([
		Deno.readTextFile('assets/charList.txt'),
		fetch(
			'https://cdn.jsdelivr.net/gh/mshaugh/nerdfont-webfonts/build/fonts/FiraCodeNerdFont-Regular.woff2',
		)
			.then((res) => res.arrayBuffer()),
	]).then(([characters, fontBuffer]) =>
		subsetFont(new Uint8Array(fontBuffer), characters, { targetFormat: 'woff2' })
	),

	css: Promise.all(
		[...Deno.readDirSync('./client/styles')]
			.map(({ name }) => Deno.readTextFile(join('./client/styles', name))),
	).then((contents) => '\n' + contents.join('\n')),

	html: Deno.readTextFile('./client/client.html'),
	iconMap: Deno.readTextFile('./assets/iconMap.json').then(JSON.parse),
}

const bundleResult = await tasks.bundle
if (!bundleResult.success || !bundleResult.outputFiles) {
	console.error('Bundle errors:', bundleResult.errors)
	throw new Error('Failed to bundle client code')
}

const transpiledBundle = bundleResult.outputFiles[0].text()

const buildHtmlTemplate = async (): Promise<string> => {
	const [clientCSS, iconMap, htmlString] = await Promise.all([
		tasks.css,
		tasks.iconMap,
		tasks.html,
	])

	const finalHtml = htmlString
		.replace(
			'$PLACEHOLDER-HEAD',
			`<meta name="description" property="og:description" content="${config.description}">
	  <link rel="stylesheet" href="/!!/photoswipe.css">
	  <style>${clientCSS}</style>
	  <script>window.config = ${JSON.stringify(config)}</script>`,
		)
		.replace('$PLACEHOLDER-JS', `<script>${transpiledBundle}</script>`)
		.replace('$PLACEHOLDER-TITLE', config.title)
		.replace('$PLACEHOLDER-EXPLORER', createExplorerBuilder(iconMap)(vaultMap.children))
		.replace('\n', config.minify ? '' : '\n')

	return config.minify
		? await minify(finalHtml, {
			collapseWhitespace: true,
			removeComments: true,
			minifyCSS: false,
			minifyJS: false,
			keepClosingSlash: true,
			caseSensitive: true,
		})
		: finalHtml
}

export const [htmlTemplate, nerdFont] = await Promise.all([
	buildHtmlTemplate(),
	tasks.font,
])
