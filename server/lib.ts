import { statSync } from 'node:fs'
import mime from 'mime-types'
import picomatch from 'picomatch'
import { yellow } from 'picocolors'

import * as CONFIG from './config.ts'
import { VaultMap } from './types.ts'
import { vaultMap } from './vaultmap.ts'

export const contentType = (extension: string): string | false =>
	mime.contentType(extension.replace(/^\./, ''))

export const escapeHTML = (str: string): string => {
	return str.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

export const formatBytes = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes'

	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	const value = bytes / Math.pow(k, i)

	if (value < 10) return value.toPrecision(3) + ' ' + sizes[i]
	if (value < 100) return value.toPrecision(3) + ' ' + sizes[i]
	return Math.round(value) + ' ' + sizes[i]
}

export const toHTTPLink = (link: string | null | undefined): string | null => {
	const trimmed = link?.trim()
	if (!trimmed)
		return null

	const hasCommonTld = /\.(com|org|net|io|dev|app|ai|co|uk|gov|edu|me|xyz|tv|gg)([/_?#\s]|$)/i
		.test(trimmed)
	const startsWithHttp = /^https?:\/\//.test(trimmed)
	const isLocalhost = trimmed.startsWith('localhost')

	if (startsWithHttp || isLocalhost || hasCommonTld)
		return startsWithHttp ? trimmed : 'https://' + trimmed

	return null
}

export const fileExists = (path: string): boolean => {
	try {
		statSync(path)
		return true
	} catch {
		return false
	}
}

export const zipContent = async (): Promise<Uint8Array> => {
	const JSZip = (await import('jszip')).default

	const zip = new JSZip()
	const glob = new Bun.Glob('**/*')

	for await (
		const relative of glob.scan({ cwd: CONFIG.CONTENT_DIR, onlyFiles: true })
	) {
		const data = await Bun.file(`${CONFIG.CONTENT_DIR}/${relative}`).arrayBuffer()
		zip.file(relative, data)
	}

	const content = await zip.generateAsync({ type: 'uint8array' })
	return content
}

export const memoize = <T extends (...args: any[]) => any>(
	fn: T,
	maxSizeKB: number,
): T => {
	const cache = new Map<string, ReturnType<T>>()
	const maxBytes = maxSizeKB * 1024
	let currentSize = 0

	const sizeOf = (k: string, v: ReturnType<T> | undefined) =>
		k.length * 2 + JSON.stringify(v).length * 2 + 64

	const keyOf = (...args: any[]) =>
		args.length === 0 ?
			'' :
			args.length === 1
			? typeof args[0] === 'object' && args[0] !== null
				? JSON.stringify(args[0])
				: String(args[0])
			: args.map((a) => typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))
				.join('|')

	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = keyOf(...args)
		if (cache.has(key)) return cache.get(key)!

		const result = fn(...args) as ReturnType<T>
		const entrySize = sizeOf(key, result)

		while (currentSize + entrySize > maxBytes && cache.size) {
			const firstKey = cache.keys().next().value as string | undefined
			if (!firstKey) break

			const firstValue = cache.get(firstKey)
			currentSize -= sizeOf(firstKey, firstValue)
			cache.delete(firstKey)
		}

		cache.set(key, result)
		currentSize += entrySize
		return result
	}) as T
}

export const toTitleCase = (fileName: string): string => {
	return fileName
		.replace(/[^a-zA-Z0-9]/g, ' ')
		.split(/[-_]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

export const replaceUnicode = (text: string): string => {
	return text.replace(
		/\\u([0-9a-f]{4})|&#(?:x([0-9a-f]+)|(\d+));/gi,
		(_, p1, p2, p3) => {
			const code = p1
				? parseInt(p1, 16) // \uXXXX
				: p2
				? parseInt(p2, 16) // &#xHEX
				: parseInt(p3, 10) // &#DEC

			return code <= 0x10FFFF ? String.fromCodePoint(code) : ''
		},
	)
}

const matcherCache = new Map<string, (path: string) => boolean>()
export const pathMatchesGlob = (path: string, glob: string): boolean => {
	let matcher = matcherCache.get(glob)
	if (!matcher) {
		matcher = picomatch(glob, { dot: true })
		matcherCache.set(glob, matcher)
	}
	return matcher(path)
}

export const warn = (message: string): void => {
	if (CONFIG.LOG_WARNINGS || CONFIG.VERBOSE) console.warn(yellow(message))
}

export const generateMap = (): string => {
	return `# ${CONFIG.TITLE}
*this explore page was generated dynamically by Bookmark*

${mapDir(vaultMap.children).join('\n')}`
}

export const mapDir = (dirs: VaultMap[]): string[] =>
	dirs.flatMap((dir) => {
		return dir.dir ? [dir.name + '/', ...mapDir(dir.children).map((e) => '  ' + e)] : dir.name
	})

export const summarizeHTML = (html: string): string => {
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const pMatches = Array.from(html.matchAll(/<p[^>]*>(.*?)<\/p>/gi), m => stripTags(m[1]).trim()).filter(Boolean);
  let summary = '';
  for (const p of pMatches) {
    if (summary.length >= 75) break;
    summary += (summary ? '\n' : '') + p;
  }
  if (summary) return truncate(summary);
  const imgAltMatch = html.match(/<img[^>]*alt=["']([^"']+)["']/i);
  if (imgAltMatch) return truncate(decodeEntities(imgAltMatch[1].trim()));
  const imgSrcMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (imgSrcMatch) return truncate(getFilename(imgSrcMatch[1]));
  const mediaAltTitleMatch = html.match(/<(audio|video|iframe)[^>]*(?:alt|title)=["']([^"']+)["']/i);
  if (mediaAltTitleMatch) return truncate(decodeEntities(mediaAltTitleMatch[2].trim()));
  const mediaSrcMatch = html.match(/<(audio|video|iframe)[^>]*src=["']([^"']+)["']/i);
  if (mediaSrcMatch) return truncate(getFilename(mediaSrcMatch[2]));
  const rawText = stripTags(html).trim();
  return truncate(rawText);
};

const decodeEntities = (str: string): string => str.replace(/&([^;]+);/g, (_, entity) => {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return entities[entity] || _;
});

const getFilename = (url: string): string => {
  const parts = url.split('/');
  return decodeURIComponent(parts[parts.length - 1] || url);
};

const stripTags = (str: string): string => str.replace(/<[^>]+>/g, '');

const truncate = (str: string): string => {
  if (str.length <= 100) return str;
  const truncated = str.slice(0, 97);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
};
