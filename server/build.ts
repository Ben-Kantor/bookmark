import { join } from 'jsr:@std/path@1'
import { minify } from 'npm:html-minifier-terser@7'
import * as CONFIG from './config.ts'
import subsetFont from './subset-font.ts'
import { vaultMap } from './vaultmap.ts'
import { createExplorerBuilder } from './build-explorer.ts'

const buildStartTime = performance.now()

const logTask = async <T>(taskName: string, promise: Promise<T>): Promise<T> => {
	if (!CONFIG.VERBOSE)
		return promise
	try {
		const result = await promise
		const elapsedTime = (performance.now() - buildStartTime).toFixed(2)
		console.log(`✅ T+${elapsedTime}ms: ${taskName}`)
		return result
	} catch (error) {
		const elapsedTime = (performance.now() - buildStartTime).toFixed(2)
		console.error(`❌ T+${elapsedTime}ms: ${taskName}`)
		throw error
	}
}

const tasks = {
	bundle: logTask(
		'Bundling client code',
		Deno.bundle({
			entrypoints: ['./client/src/init-client.ts'],
			minify: CONFIG.MINIFY,
			write: false,
			platform: 'browser' as Deno.bundle.Platform,
			format: 'iife' as Deno.bundle.Format,
			sourcemap: CONFIG.SOURCE_MAP ? 'inline' : undefined,
		}),
	),

	font: logTask(
		'Subsetting Nerd Font',
		Promise.all([
			Deno.readTextFile('assets/charList.txt'),
			fetch(
				'https://cdn.jsdelivr.net/gh/mshaugh/nerdfont-webfonts/build/fonts/FiraCodeNerdFont-Regular.woff2',
			)
				.then((res) => res.arrayBuffer()),
		]).then(([characters, fontBuffer]) =>
			subsetFont(new Uint8Array(fontBuffer), characters, { targetFormat: 'woff2' })
		),
	),

	css: logTask(
		'Concatenating CSS',
		Promise.all(
			[...Deno.readDirSync('./client/styles')]
				.map(({ name }) => Deno.readTextFile(join('./client/styles', name))),
		).then((contents) => '\n' + contents.join('\n')),
	),

	html: logTask('Reading HTML template', Deno.readTextFile('./client/client.html')),
	iconMap: logTask(
		'Parsing icon map',
		Deno.readTextFile('./assets/iconMap.json').then(JSON.parse),
	),
}

const bundleResult = await tasks.bundle
if (!bundleResult.success || !bundleResult.outputFiles) {
	console.error('Bundle errors:', bundleResult.errors)
	throw new Error('Failed to bundle client code')
}

const transpiledBundle = bundleResult.outputFiles[0].text()

const buildHtmlTemplate = async (): Promise<string> => {
	const [clientCSS, iconMap, htmlString, resolvedBundle] = await Promise.all([
		tasks.css,
		tasks.iconMap,
		tasks.html,
		transpiledBundle,
	])

	const finalHtml = htmlString
		.replace(
			'$PLACEHOLDER-HEAD',
			`<meta name="description" property="og:description" content="${CONFIG.DESCRIPTION}">
      <link rel="stylesheet" href="/!!/photoswipe.css">
      <style>${clientCSS}</style>
      <script>window.config = ${JSON.stringify(CONFIG)}</script>`,
		)
		.replace('$PLACEHOLDER-JS', `<script>${resolvedBundle}</script>`)
		.replace('$PLACEHOLDER-TITLE', CONFIG.TITLE)
		.replace('$PLACEHOLDER-EXPLORER', createExplorerBuilder(iconMap)(vaultMap.children))
		.replace('\n', CONFIG.MINIFY ? '' : '\n')

	return CONFIG.MINIFY
		? logTask(
			'Minifying final HTML',
			minify(finalHtml, {
				collapseWhitespace: true,
				removeComments: true,
				minifyCSS: true,
				minifyJS: true,
				keepClosingSlash: true,
				caseSensitive: true,
			}),
		)
		: finalHtml
}

export const htmlTemplate = await logTask('Building final HTML template', buildHtmlTemplate())
