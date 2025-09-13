import { Marked, TokenizerAndRendererExtension, Tokens } from "npm:marked"
import { markedSmartypantsLite } from 'npm:marked-smartypants-lite'
import { markedHighlight } from 'npm:marked-highlight'
import markedFootnote from 'npm:marked-footnote'
import hljs from 'npm:highlight.js'
import * as sanitizeHtml from 'npm:sanitize-html'
import { yellow } from 'jsr:@std/fmt/colors'
import { basename, dirname, extname, join } from 'jsr:@std/path'

import { findFilePath, vaultMap } from './vaultmap.ts'
import { fileExists, replaceUnicode, toHTTPLink, toTitleCase, warn } from './lib.ts'
import * as types from './types.ts'
import { config } from './constants.ts'
import { processEmbed } from './embed-processor.ts'

export const renderMarkdown = async (
	markdown: string,
	currentPath: string,
	noEmbeds?: boolean,
	addTitle?: boolean
): Promise<string> => {
	if(!markdown) return ''
	if (addTitle && !markdown.startsWith('# ')) {
		markdown = `# ${toTitleCase(basename(currentPath))}\n\n${markdown}`
	}
	if (addTitle && markdown.match(/^#\s(.*)|<h1>(.*)<\/h1>\n/)) {
		console.warn(
			yellow(`File ${currentPath} contains multiple level 1 headers.`)
		)
	}
	markdown = replaceUnicode(markdown)
	markdown = markdown.replace(/<br>/g, '\n')

	// Store code blocks and inline code with placeholders BEFORE processing embeds
	const codeElements: { placeholder: string; content: string }[] = []
	let codeCounter = 0

	// Replace code blocks first
	markdown = markdown.replace(/```[\s\S]+?```/g, (match) => {
		const placeholder = `__CODE_BLOCK_${codeCounter++}__`
		codeElements.push({ placeholder, content: match })
		return placeholder
	})

	// Replace inline code
	markdown = markdown.replace(/`[^`\n]+`/g, (match) => {
		const placeholder = `__INLINE_CODE_${codeCounter++}__`
		codeElements.push({ placeholder, content: match })
		return placeholder
	})

	// Now process embeds (code elements are safely placeholder-ed)
	const embedPromises: Promise<{ placeholder: string; content: string }>[] = []
	const embedPlaceholders: string[] = []
	const embedRegex = /(!)?(?:\[\[([^\]]+)\]\]|\[(?!\^)([^\]]+)\](?:\(([^\)]+)\))?)/g
	let match
	let processedMarkdown = markdown

	while ((match = embedRegex.exec(markdown)) !== null) {
		const [
			raw,
			linkPrefix,
			doubleBracketTerm,
			bracketTerm,
			parenthesesTerm,
		] = match
		if (linkPrefix === '!') {
			if (noEmbeds) {
				processedMarkdown = processedMarkdown.replace(
					raw,
					'\n!' + raw.slice(1).trimEnd() + '\n'
				)
				continue
			}
			const placeholder = `<!-- EMBED_${embedPlaceholders.length} -->`
			embedPlaceholders.push(placeholder)
			const embedPromise = processEmbed(
				doubleBracketTerm,
				bracketTerm,
				parenthesesTerm,
				currentPath,
				config.paths.contentDir
			).then(content => ({
				placeholder,
				content,
			}))
			embedPromises.push(embedPromise)
			processedMarkdown = processedMarkdown.replace(raw, placeholder)
		}
	}

	// Restore code elements before markdown processing
	for (const { placeholder, content } of codeElements) {
		processedMarkdown = processedMarkdown.replace(placeholder, content)
	}

	// Process code blocks with syntax highlighting
	processedMarkdown = processedMarkdown.replace(
		/```[\s\S]+?```/g,
		(match) => escapeBrackets(match)
	)
	processedMarkdown = processedMarkdown.replace(
		/\`\`\`([^\n\\]+)([\n\\][^\`]+)\`\`\`/gm,
		(_match, lang, code) => {
			if (hljs.getLanguage(lang)) {
				return '```' + lang + '\n' + code.trim() + '\n```'
			} else if (lang) {
				warn(`Codeblock with invalid language ${lang} in file ${currentPath}`)
				return '```' + lang + '\n' + code.trim() + '\n```'
			}
			const result = hljs.highlightAuto(code.replace(/^\n+|\n+$/g, '')).language
			warn(`Codeblock without specified language or invalid, in file ${currentPath}`)
			return '```' + result + '\n' + code.trim() + '\n```'
		}
	)

	const resolvedEmbeds = await Promise.all(embedPromises)
	const markedInstance = new Marked()
	markedInstance
	.use(markedSmartypantsLite())
	.use(markedFootnote({
		keepLabels: true
	}))
	.use({
		extensions: [
			createCustomLinksExtension(
				currentPath,
				vaultMap,
				config.paths.contentDir
			),
		],
	}).use(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext'
				try {
					return hljs.highlight(code, {
						language,
						ignoreIllegals: true,
					}).value
				} catch {
					return hljs.highlight(code, { language: 'plaintext' }).value
				}
			},
		})
	).setOptions({
		gfm: true,
		breaks: false,
		pedantic: false,
	})

	let result = markedInstance.parse(processedMarkdown) as string

	for (const { placeholder, content } of resolvedEmbeds) {
		result = result.replace(placeholder, content)
	}

	const finalResult =result
		.replace(/\\(?:<[^>]+>)*([\[\]])/g,(_, bracket) => bracket) //unescape brackets
		.replace(/\\\`/gm,"`") //unescape backticks
	if(config.sanitize) return sanitizeHtml(finalResult)
	return finalResult
}
export const createCustomLinksExtension = (
	currentPath: string,
	vaultMap: types.VaultMap,
	contentDir: string
): TokenizerAndRendererExtension => {
	const extension: TokenizerAndRendererExtension = {
		name: 'customLinks',
		level: 'inline' as const,
		start(src: string) {
			const i = src.search(/(?<!\!)(\[\[|\[)/)
			return i === -1 ? undefined : i
		},
		tokenizer(src: string): Tokens.Generic | undefined {
			const rule = /^(?:\[\[([^\]]+)\]\]|\[(?!\^)([^\]]+)\](?:\(([^\)]+)\))?)/
			const match = rule.exec(src)

			if (match) {
				const [raw, doubleBracketTerm, bracketTerm, parenthesesTerm] =
					match
				if (src.startsWith('\\')) return undefined

				return {
					type: 'customLinks',
					raw,
					isEmbed: false,
					isWikilink: !!doubleBracketTerm,
					doubleBracketTerm: decodeURI(doubleBracketTerm || ''),
					bracketTerm: decodeURI(bracketTerm || ''),
					parenthesesTerm: decodeURI(parenthesesTerm || ''),
				}
			}
			return undefined
		},
		renderer(token: Tokens.Generic): string {
			const {
				isWikilink,
				doubleBracketTerm,
				bracketTerm,
				parenthesesTerm,
			} = token

			let mutableBracketTerm = bracketTerm
			if (
				mutableBracketTerm?.startsWith('<') &&
				mutableBracketTerm.endsWith('>')
			) {
				mutableBracketTerm = mutableBracketTerm.slice(1, -1)
			}

			const linkSource =
				doubleBracketTerm || parenthesesTerm || mutableBracketTerm
			const rawLinkTarget = linkSource?.split(/[|#]/)[0]
			const linkAnchor = linkSource?.split(/#(.*)$/)[1]

			const displayText = isWikilink
				? doubleBracketTerm.split(/[|#]/)[1] || rawLinkTarget
				: mutableBracketTerm || rawLinkTarget

			if (!rawLinkTarget) {
				return `<a class="broken-link">${displayText}</a>`
			}

			const remoteLink = toHTTPLink(rawLinkTarget)
			if (remoteLink) {
				const finalURL =
					remoteLink + (linkAnchor ? `#${linkAnchor}` : '')
				return `<a href="${finalURL}" class="link">\u{1f517} ${displayText.trim()}</a>`
			}

			let targetPathFromContentDir: string | undefined

			if (isWikilink) {
				const term = doubleBracketTerm.split(/[|#]/)[0]
				if (term.includes('.')) {
					const parts = term.split('.')
					targetPathFromContentDir = findFilePath(
						vaultMap,
						parts[0],
						`.${parts[1]}`
					)
				} else {
					targetPathFromContentDir =
						findFilePath(vaultMap, term, '.md') ||
						findFilePath(vaultMap, term)
				}
			} else {
				const prospectivePath = join(
					dirname(currentPath),
					rawLinkTarget
				)

				if (fileExists(join(contentDir, prospectivePath))) {
					targetPathFromContentDir = prospectivePath
				} else {
					const base = basename(rawLinkTarget, extname(rawLinkTarget))
					const ext = extname(rawLinkTarget)
					targetPathFromContentDir = findFilePath(vaultMap, base, ext)
				}
			}

			if (!targetPathFromContentDir) {
				console.warn(
					yellow(
						`Missing or malformed link ${token.raw} in /${currentPath}`
					)
				)
				return `<a class="broken-link">${displayText.trim()}</a>`
			}

			const finalHref = '/' + targetPathFromContentDir.replace(/\\/g, '/')
			const finalURL = finalHref + (linkAnchor ? `#${linkAnchor}` : '')

			return `<a href="${finalURL}" class="link">${displayText.trim()}</a>`
		},
	}

	return extension
}

const escapeBrackets = (input: string): string  => {
  return input.replaceAll("[", "\\[")
}
