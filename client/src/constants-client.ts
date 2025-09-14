import { PaletteResult } from '../../server/types.ts'

export const scrollAmount = 240
export const columnIds = ['explorer', 'content-area-wrapper', 'toc-panel']

export let activeIndex = -1
export let lastFocusedItem: HTMLElement | null = null
export let cols: (HTMLElement | null)[]
export let paletteResults: PaletteResult[] = []
export let paletteSelectedIndex = 0

export const toTitleCase = (fileName: string): string =>
  fileName
    .replace('.md', '')
    .split(/[-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export const explorerList = document.getElementById('explorer-list') as HTMLUListElement
export const tocList = document.getElementById('toc-list') as HTMLUListElement
export const mainContentEl = document.querySelector('main.content') as HTMLElement
export const contentAreaEl = document.getElementById('content-area') as HTMLElement

export const expandedFolders: { [key: string]: boolean } = JSON.parse(
  localStorage.getItem('explorerFolders') || '{}'
)

export const expandedTocItems: { [key: string]: boolean } = JSON.parse(
  localStorage.getItem('tocItems') || '{}'
)

export const paletteOverlay = document.getElementById('command-palette-overlay') as HTMLElement
export const paletteInput = document.getElementById('command-palette-input') as HTMLInputElement
export const paletteResultsEl = document.getElementById('command-palette-results') as HTMLUListElement

//throw an error if any of the elements are not found
[explorerList, tocList, mainContentEl, contentAreaEl, paletteOverlay, paletteInput, paletteResultsEl].forEach(el => {
	if (!el) throw new Error("UI Element not found")
})


export const setActiveIndex = (index: number): number => activeIndex = index
export const setLastFocusedItem = (item: HTMLElement | null): HTMLElement | null => lastFocusedItem = item
export const setCols = (columns: (HTMLElement | null)[]): (HTMLElement | null)[] => cols = columns
export const setPaletteResults = (results: PaletteResult[]): PaletteResult[] => paletteResults = results
export const setPaletteSelectedIndex = (index: number): number => paletteSelectedIndex = index

export const FOLDER_OPEN_ICON = '\uf07c'
export const FOLDER_CLOSED_ICON = '\uf07b'
