import { yellow } from "jsr:@std/fmt@0.223/colors";
import { config, contentDir } from "./constants.ts"
import { globToRegExp } from "https://deno.land/std@0.208.0/path/glob_to_regexp.ts";

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
	if (!trimmed) {
		return null
	}

	const hasCommonTld = /\.(com|org|net|io|dev|app|ai|co|uk|gov|edu|me|xyz)([/_?#\s]|$)/.test(trimmed)
	const startsWithHttp = /^https?:\/\//.test(trimmed)
	const isLocalhost = trimmed.startsWith('localhost')

	if (startsWithHttp || isLocalhost || hasCommonTld) {
		return startsWithHttp ? trimmed : 'https://' + trimmed
	}

	return null
}

export const fileExists = (path: string): boolean => {
	try {
		Deno.statSync(path)
		return true
	} catch {
		return false
	}
}

export const zipContent = async (): Promise<Uint8Array> => {
	const { walk } = await import("https://deno.land/std@0.224.0/fs/walk.ts")
	const { zipSync } = await import("npm:fflate@0.8.2")

	const files: Record<string, Uint8Array> = {}

	for await (const entry of walk(contentDir, { includeDirs: false })) {
		const data = await Deno.readFile(entry.path)
		const relative = entry.path.replace(/^content[\/\\]/, "")
		files[relative] = data
	}

	return zipSync(files)
}

export const pathMatches = (base: string, test: string): boolean => {
	if (test.startsWith(".")) test = test.substring(1)
	if (base.startsWith(".")) base = base.substring(1)
	
	const regexTest = test.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '.*')
		.replace(/\*/g, '[^/.]*')

	const regex = new RegExp(`^${regexTest}$`)
	return regex.test(base)
}

// deno-lint-ignore no-explicit-any
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  maxSizeKB: number
): T => {
  const cache = new Map<string, ReturnType<T>>();
  const maxBytes = maxSizeKB * 1024;
  let currentSize = 0;

  const sizeOf = (k: string, v: ReturnType<T> | undefined) =>
    k.length * 2 + JSON.stringify(v).length * 2 + 64;

  // deno-lint-ignore no-explicit-any
  const keyOf = (...args: any[]) =>
    args.length === 0 ? '' :
    args.length === 1
      ? typeof args[0] === 'object' && args[0] !== null
        ? JSON.stringify(args[0])
        : String(args[0])
      : args.map(a =>
          typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)
        ).join('|');

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyOf(...args);
    if (cache.has(key)) return cache.get(key)!;

    const result = fn(...args) as ReturnType<T>;
    const entrySize = sizeOf(key, result);

    while (currentSize + entrySize > maxBytes && cache.size) {
      const firstKey = cache.keys().next().value as string | undefined;
      if (!firstKey) break;

      const firstValue = cache.get(firstKey);
      currentSize -= sizeOf(firstKey, firstValue);
      cache.delete(firstKey);
    }

    cache.set(key, result);
    currentSize += entrySize;
    return result;
  }) as T;
};


export const toTitleCase = (fileName: string): string => {
	return fileName
		.replace(".md", "")
		.split(/[-_]+/)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

export const replaceUnicode = (text: string): string => {
  return text.replace(
    /\\u([0-9a-f]{4})|&#(?:x([0-9a-f]+)|(\d+));/gi,
    (_, p1, p2, p3) => {
      const code = p1
        ? parseInt(p1, 16)        // \uXXXX
        : p2
        ? parseInt(p2, 16)        // &#xHEX;
        : parseInt(p3, 10);       // &#DEC;

      return code <= 0x10FFFF ? String.fromCodePoint(code) : "";
    }
  );
}

export const titleFromMarkdown = (markdown: string): string | undefined => {
	return markdown.match(/\A#\s(.+)\n/)?.[1]
}

const globToRegExpMemo = memoize(globToRegExp, 10)
export const pathMatchesGlob = (path: string, glob: string): boolean => {
	return globToRegExpMemo(glob).test(path)
}

export const warn = (message: string): void => {
	if (config.logWarnings) console.warn(yellow(message))
}