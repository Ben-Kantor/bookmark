import * as types from './types.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'
import { escapeHTML, warn } from './lib.ts'

export const createEmbedWithProperties = (
	content: string,
	displayText: string,
	properties: types.EmbedProperties,
	targetPath?: string,
): string => {
	const parser = new DOMParser()
	let element = parser
		.parseFromString(`${content}`, 'text/html')
		?.body

	if (element?.children.length === 0) {
		warn(`No content found in embed ${targetPath}`)
		return "<md-embed role='group' title='Error: Missing or malformed embed</p>'>![Embedded Content]</md-embed>"
	}

	if (element?.firstElementChild?.tagName.toLowerCase() === 'div')
		element = element.firstElementChild

	if (element) {
		if (properties.firstpage || properties.lastpage) {
			const first = properties.firstpage ? properties.firstpage : 1
			const last = properties.lastpage ? properties.lastpage : first
			const pageFragment = `#page=${first}-${last}`

			if (
				element.tagName.toLowerCase() === 'iframe' &&
				element.getAttribute('src')?.toLowerCase().endsWith('.pdf')
			) {
				const src = element.getAttribute('src') || ''
				element.setAttribute('src', src + pageFragment)
			} else {
				warn(`Cannot specify pages for non-PDF embed in ${targetPath}`)
			}
		}

		content = element.outerHTML
	}
	content = content.trim()

	if (properties.numbered) content = addLineNumbers(content)

	if (properties.startHeader || properties.endHeader)
		content = processHeaderSection(content, properties, targetPath)

	if (properties.firstline || properties.lastline)
		content = processLineSection(content, properties)

	let style = ''
	if (properties.width) style += `width:${properties.width};`
	if (properties.height) style += `height:${properties.height};`
	if (properties.css) style += properties.css

	const display = properties.noTitle ? '' : (displayText || properties.title || '')
	return `<md-embed role="group" style="${style}"	title="${
		escapeHTML(display)
	}">${content}</md-embed>`.replace(/<body>/g, '').replace(/<\/body>/g, '')
}

export const extractEmbedProperties = (s: string): types.EmbedProperties => {
	const properties: types.EmbedProperties = {}
	const terms = s.split(/[\|#]/).slice(1)

	for (const term of terms) {
		const [key, value] = term.split('=')

		if (!value) {
			if (key === 'numbered') {
				properties.numbered = true
				continue
			}
			if (key === 'notitle') {
				properties.title = ''
				continue
			}
			if (/\d+x\d+/.test(key)) {
				const [w, h] = key.split('x')
				properties.width = w
				properties.height = h
				continue
			}
			if (s.includes('#' + key)) {
				properties.startHeader = key
				continue
			}
			if (s.includes('|' + key)) {
				properties.title = key
				continue
			}
		}

		switch (key) {
			case 'height':
				properties.height = value
				continue
			case 'width':
				properties.width = value
				continue
			case 'title':
				properties.title = stripQuotes(value)
				continue
			case 'style':
			case 'css':
				properties.css = value
				continue
			case 'header':
			case 'headers': {
				const [start, end] = value.split('-')
				properties.startHeader = stripQuotes(start)
				properties.endHeader = stripQuotes(end)
				continue
			}
			case 'page':
			case 'pages': {
				const [start, end] = value.split('-')
				properties.firstpage = +start
				properties.lastpage = +end
				continue
			}
			case 'line':
			case 'lines': {
				const [start, end] = value.split('-')
				properties.firstline = +start
				properties.lastline = +end
				continue
			}
		}
	}
	if (!properties.title) properties.title = s.split(/[\|\#]/)[0].trim()
	return properties
}

const stripQuotes = (s: string): string => {
	if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'"))
		return s.slice(1, -1)
	return s
}

export const splitHtmlWrappers = (html: string): [string, string, string] => {
	let s = html.trim() // strip outer whitespace only
	let openSeq = ''
	let closeSeq = ''

	while (s.startsWith('<')) {
		const m = s.match(/^<([a-zA-Z0-9-]+)(\s[^>]*)?>/)
		if (!m) break

		const tag = m[1]
		const openTag = m[0]

		// scan for the matching closing tag with same-name depth tracking
		const openRe = new RegExp(`<${tag}(?=[\\s>/])`, 'gi')
		const closeRe = new RegExp(`</${tag}>`, 'gi')

		let depth = 1
		let i = openTag.length
		let closeIdx = -1

		while (i < s.length) {
			openRe.lastIndex = i
			closeRe.lastIndex = i

			const o = openRe.exec(s)
			const c = closeRe.exec(s)

			const nextOpen = o ? o.index : -1
			const nextClose = c ? c.index : -1

			if (nextClose === -1) {
				closeIdx = -1
				break
			}

			if (nextOpen !== -1 && nextOpen < nextClose) {
				depth++
				i = o!.index + 1 // advance to avoid re-matching same open
			} else {
				depth--
				i = c!.index + c![0].length // move past this close
				if (depth === 0) {
					closeIdx = c!.index
					break
				}
			}
		}

		if (closeIdx === -1) break

		// only peel if the close is at the very end (ignoring trailing whitespace)
		const closeTag = `</${tag}>`
		const after = s.slice(closeIdx + closeTag.length)
		if (after.trim() !== '') break // not a true wrapper; stop peeling

		// accumulate wrapper and slice inner WITHOUT trimming
		openSeq += openTag
		closeSeq = closeTag + closeSeq
		s = s.slice(openTag.length, closeIdx)
	}

	return [openSeq, s, closeSeq]
}

const processHeaderSection = (
	embeddedHTML: string,
	properties: types.EmbedProperties,
	targetPath: string | undefined,
): string => {
	const headerRegex = new RegExp(
		`<h([1-6])[^>]*>\\s*${escapeRegex(properties.startHeader!)}\\s*</h[1-6]>`,
		'i',
	)
	const match = embeddedHTML.match(headerRegex)

	if (!match) {
		warn(
			`Header "${properties.startHeader}" not found in embedded file ${targetPath}`,
		)
		return embeddedHTML
	}

	const headerLevel = parseInt(match[1])
	const startIndex = match.index!
	let endIndex = embeddedHTML.length

	if (properties.endHeader) {
		const lastHeaderRegex = new RegExp(
			`<h([1-6])[^>]*>\\s*${escapeRegex(properties.endHeader)}\\s*</h[1-6]>`,
			'i',
		)
		const lastMatch = embeddedHTML.slice(startIndex).match(lastHeaderRegex)

		if (lastMatch)
			endIndex = startIndex + lastMatch.index!
	} else {
		const nextHeaderRegex = new RegExp(`<h([1-${headerLevel}])[^>]*>`, 'i')
		const nextMatch = embeddedHTML.slice(startIndex + match[0].length).match(
			nextHeaderRegex,
		)

		if (nextMatch)
			endIndex = startIndex + match[0].length + nextMatch.index!
	}

	let section = embeddedHTML.slice(startIndex, endIndex).trim()

	if (properties.numbered && section.includes('\n')) {
		section = section
			.split('\n')
			.map((line, index) =>
				line.trim() ? `<span class="line-number">${index + 1}.</span> ${line}` : line
			)
			.join('\n')
	}

	return section
}

const processLineSection = (
	embeddedHTML: string,
	properties: types.EmbedProperties,
): string => {
	const splitResult = splitHtmlWrappers(embeddedHTML)
	const lines = splitResult[1].split('\n')

	const first = (properties.firstline || 1) - 1
	const last = properties.lastline ? properties.lastline : lines.length
	const selected = lines.slice(first, last).join('\n').trim()

	return splitResult[0] + selected + splitResult[2]
}

const escapeRegex = (str: string): string => {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const addLineNumbers = (html: string): string => {
	return html.replace(
		/<pre.*?>\s*<code.*?>([\s\S]*?)<\/code>\s*<\/pre>/gi,
		(match, codeContent) => {
			const lines = codeContent.split('\n')
			const lastIndex = lines.length - 1
			const numberedLines = lines.map((line: string, i: number) => {
				if (i === lastIndex && line.trim() === '') return ''
				const content = line.trim() === '' ? '&nbsp;' : line
				return `<span class="line-number">${i + 1}. </span>${content}`
			})
			return match.replace(codeContent, numberedLines.join('\n'))
		},
	)
}
