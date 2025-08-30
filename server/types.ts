export interface fileRequestInfo {
	filePath?: string //absolute path to the file to serve
	status?: undefined | 403 | 404 | 500
	isLiteralRequest?: boolean
	preferredAddress?: string
	isWebLink?: boolean
}

export interface SiteConfig {
	title: string
	description: string
	port: number
	minify: boolean
	sourceMap: boolean
	sanitize: boolean
	paths: {
		contentDir: string
		assetsDir: string
		indexFile: string
	}
	renderOverrides: { [key: string]: string[] }
	logWarnings: boolean
}

export interface EmbedProperties {
	height?: number | string
	width?: number | string
	firstpage?: number
	lastpage?: number
	noTitle?: boolean
	firstline?: number
	lastline?: number
	title?: string
	css?: string
	numbered?: boolean
	startHeader?: string
	endHeader?: string
}

export interface FileTypeIcons {
	[key: string]: string
}

export interface Command {
	name: string
	aliases?: string[]
	run: () => void
}

export interface VaultMapFile {
	name: string
	title?: string
	dir: false
}

export interface VaultMapDirectory {
	name: string
	dir: true
	isRoot?: boolean
	children: VaultMap[]
}

export type VaultMap = VaultMapDirectory | VaultMapFile
export interface FilePaletteResult {
	label: string
	type: 'file'
	path: string
}

export interface CommandPaletteResult {
	label: string
	type: 'command'
	run: () => void
}

export type PaletteResult = FilePaletteResult | CommandPaletteResult

export interface TocItem {
	id: string
	text: string
	level: number
	children: TocItem[]
}


export interface ExplorerItem {
  type: 'directory' | 'file';
  name: string;
  path: string;
  displayName: string;
  extension: string | null;
  isActive: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  children: ExplorerItem[];
}