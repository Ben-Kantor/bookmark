import { Command } from '../../server/types.ts'

import {
	paletteInput,
	paletteOverlay,
	paletteResults,
	paletteResultsEl,
	paletteSelectedIndex,
	setPaletteResults,
	setPaletteSelectedIndex,
} from './constants.ts'

import { downloadFile, navigateTo } from './utilities.ts'

type PaletteItem =
	| { label: string; type: 'command'; run: () => void }
	| { label: string; type: 'file'; path: string }

export const openCommandPalette = (): void => {
	try {
		//@ts-ignore lightbox is created in js embedded in the html
		if (lightbox?.pswp) return
	} catch {
		/* lightbox not active, ignore */
	}
	paletteOverlay.style.pointerEvents = 'auto'
	paletteOverlay.classList.remove('hidden')

	paletteInput.value = ''
	setTimeout(() => paletteInput.focus(), 0)

	updatePaletteResults('')
}

export const closeCommandPalette = (): void => {
	paletteOverlay.style.pointerEvents = 'none'
	paletteOverlay.classList.add('hidden')
}

export const updatePaletteResults = (query: string): void => {
	const lower: string = query.toLowerCase()

	const fileMatches: PaletteItem[] = searchFilesFromDOM(lower)

	const commandMatches: PaletteItem[] = commands
		.filter(
			({ name, aliases }) =>
				name.toLowerCase().includes(lower) ||
				aliases?.some((a) => a.toLowerCase().includes(lower)),
		)
		.map(({ name, run }) => ({
			label: name,
			type: 'command',
			run,
		}))

	setPaletteResults([...commandMatches, ...fileMatches])
	setPaletteSelectedIndex(0)

	renderPaletteResults()
}

export const renderPaletteResults = (): void => {
	paletteResultsEl.innerHTML = ''

	paletteResults.forEach((item, i) => {
		const li: HTMLLIElement = document.createElement('li')
		li.setAttribute('role', 'option')

		if (i === paletteSelectedIndex) li.setAttribute('aria-selected', 'true')

		let classNames: string = 'palette-entry'
		if (i === paletteSelectedIndex) classNames += ' palette-selected'
		if (item.type === 'command') classNames += ' palette-command'

		li.className = classNames
		li.setAttribute(
			'aria-label',
			`${item.type === 'command' ? 'Command' : 'File'}: ${item.label}`,
		)
		li.innerHTML = [...item.label].reverse().join('')

		li.addEventListener('click', () => executePaletteItem(item))
		paletteResultsEl.appendChild(li)

		if (i === paletteSelectedIndex)
			requestAnimationFrame(() => li.scrollIntoView({ behavior: 'smooth', block: 'center' }))
	})
}

export const executePaletteItem = (item: PaletteItem): void => {
	closeCommandPalette()

	if (item.type === 'command') item.run()
	else navigateTo(item.path)
}

export function searchFilesFromDOM(lowerQuery: string): PaletteItem[] {
	const explorerList = document.getElementById('explorer-list')
	if (!explorerList) return []

	const results: PaletteItem[] = []

	// Search through all file links in the explorer, including those in collapsed folders
	const fileLinks = explorerList.querySelectorAll('a.explorer-file-link')

	fileLinks.forEach((link) => {
		const href = (link as HTMLAnchorElement).href
		if (!href) return

		// Extract the path from the href (remove domain/protocol)
		const url = new URL(href)
		const filePath = decodeURI(url.pathname)

		// Get the filename from the path
		const filename = filePath.split('/').pop() || ''

		// Check if filename matches query
		if (filename.toLowerCase().includes(lowerQuery)) {
			results.push({
				label: filePath,
				type: 'file',
				path: encodeURI(filePath),
			})
		}
	})

	return results
}

export const commands: Command[] = [
	{
		name: 'Reload Page',
		aliases: ['refresh'],
		run: () => globalThis.location.reload(),
	},

	{
		name: 'Download Page',
		aliases: ['save', 'export'],
		run: () => downloadFile(globalThis.location.pathname),
	},

	{
		name: 'Download Vault',
		aliases: ['save', 'export', 'zip'],
		run: () => downloadFile('/site.zip', 'site.zip'),
	},

	{
		name: 'Print Page',
		aliases: ['print', 'export'],
		run: () => {
			globalThis.print()
		},
	},
	{
		name: 'Toggle Theme',
		aliases: ['dark mode', 'light mode', 'switch theme'],
		run: () => {
			const theme: string = document.documentElement.getAttribute('data-theme') === 'dark'
				? 'light'
				: 'dark'

			localStorage.setItem('theme', theme)
			document.documentElement.setAttribute('data-theme', theme)
		},
	},

	{
		name: 'Toggle High-Contrast',
		aliases: ['high contrast', 'switch contrast'],
		run: () => {
			const enabled: boolean = localStorage.getItem('high-contrast') === 'true'
			const value: string = enabled ? 'false' : 'true'

			localStorage.setItem('high-contrast', value)
			document.documentElement.setAttribute('data-high-contrast', value)
		},
	},

	{
		name: 'View Raw Content',
		aliases: ['export', 'raw', 'source'],
		run: () => {
			const main: HTMLElement | null = document.querySelector('main.content')
			const singleEl: Element | null = main?.children.length === 1 ? main.children[0] : null

			const url: string | undefined = (singleEl as HTMLImageElement)?.src ||
				(singleEl as HTMLAnchorElement)?.href ||
				(singleEl as HTMLObjectElement)?.data ||
				singleEl?.querySelector?.('iframe')?.src ||
				singleEl?.querySelector?.('img')?.src

			if (url) {
				const w: Window | null = globalThis.open(
					url,
					'_blank',
					'width=1,height=1,left=-1000,top=-1000,toolbar=no,menubar=no,scrollbars=no,resizable=no,status=no',
				)

				setTimeout(() => {
					w?.print()
					w?.close()
				}, 1000)
			} else {
				const w: Window | null = globalThis.open('', '_blank')

				w?.document.write(
					`<html><head><title>Print</title></head><body>${
						main?.innerHTML || document.body.innerHTML
					}</body></html>`,
				)

				w?.document.close()
			}
		},
	},
]
