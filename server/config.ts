import { resolve } from 'jsr:@std/path@1.1.2'

// --- General Site Information ---
export const TITLE: string = 'Bookmark'
export const DESCRIPTION: string = 'A dynamic markdown webserver and file explorer'
const DEFAULT_PORT: number = 8000
export const PORT: number = parseInt(Deno.env.get('PORT') ?? DEFAULT_PORT.toString())

// --- File Paths ---
export const CONTENT_DIR_PATH: string = './content/'
export const ASSETS_DIR_PATH: string = './assets/'
export const INDEX_FILE: string = 'Readme.md'
export const CONTENT_DIR: string = resolve(CONTENT_DIR_PATH)
export const ABSOLUTE_CONTENT_DIR: string = resolve(Deno.cwd(), CONTENT_DIR_PATH)
export const ABSOLUTE_ASSETS_DIR: string = resolve(Deno.cwd(), ASSETS_DIR_PATH)

// --- Build and Runtime Options ---
export const MINIFY: boolean = false
export const SOURCE_MAP: boolean = false
export const SANITIZE: boolean = false
export const LOG_WARNINGS: boolean = true
export const VERBOSE: boolean = true

// --- Rendering Overrides ---
type OverrideKey =
	| 'markdown'
	| 'plaintext'
	| 'codeblock'
	| 'image'
	| 'video'
	| 'audio'
	| 'literal'
	| 'iframe'
	| 'download'

export const renderOverrides: { [key in OverrideKey]?: string[] } = {
	iframe: [],
	codeblock: ['./**.html'],
}

export const ignoreFiles: string[] = [
	'**/ignoreme',
]
