import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { minify } from 'html-minifier-terser'

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
		console.log(`✅ ${elapsedTime}ms: Finished ${taskName}`)
		return result
	} catch (error) {
		const elapsedTime = (performance.now() - buildStartTime).toFixed(2)
		console.error(`❌ ${elapsedTime}ms: ${taskName}`)
		throw error
	}
}

const tasks = {
	bundle: logTask(
		'bundle client code',
		Bun.build({
			entrypoints: [resolve(import.meta.dir, '../client/src/init-client.ts')],
			minify: CONFIG.MINIFY,
			// @ts-ignore Bun.build accepts `write` at runtime but @types/bun's BuildConfig omits it
			write: false,
			target: 'browser',
			format: 'iife',
			sourcemap: CONFIG.SOURCE_MAP ? 'inline' : 'none',
		}),
	),

	font: logTask(
		'subset Nerd Font',
		Promise.all([
			Bun.file('assets/charList.txt').text(),
			fetch(
				'https://cdn.jsdelivr.net/gh/mshaugh/nerdfont-webfonts/build/fonts/FiraCodeNerdFont-Regular.woff2',
			)
				.then((res) => res.arrayBuffer()),
		]).then(([characters, fontBuffer]) =>
			subsetFont(new Uint8Array(fontBuffer), characters, { targetFormat: 'woff2' })
		),
	),

	css: logTask(
		'concatenate CSS',
		Promise.all(
			readdirSync('./client/styles', { withFileTypes: true })
				.map(({ name }) => Bun.file(join('./client/styles', name)).text()),
		).then((contents) => '\n' + contents.join('\n')),
	),

	html: logTask('read HTML template', Bun.file('./client/client.html').text()),
	iconMap: logTask(
		'parse icon map',
		Bun.file('./assets/iconMap.json').text().then(JSON.parse),
	),
}

const bundleResult = await tasks.bundle
if (!bundleResult.success) {
	console.error('Bundle errors:', bundleResult.logs)
	throw new Error('Failed to bundle client code')
}

const entryArtifact = bundleResult.outputs.find((o) => o.kind === 'entry-point') ??
	bundleResult.outputs[0]
const transpiledBundle = await entryArtifact.text()

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
<style>${clientCSS}</style>`,
		)
		//the anon functions avoids special pattern detection in the replace function, e.g. "$&" gets replaced with the matched string
		.replace('$PLACEHOLDER-JS', () => `<script>${resolvedBundle}</script>`)
		.replace('$PLACEHOLDER-EXPLORER', () => createExplorerBuilder(iconMap)(vaultMap.children))

	return CONFIG.MINIFY
		? logTask(
			'minify final HTML',
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

export const htmlTemplate = await buildHtmlTemplate()
export const nerdFontPromise = tasks.font
