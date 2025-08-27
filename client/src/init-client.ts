import {
	explorerList,
	paletteOverlay,
	paletteInput,
	paletteResults,
	paletteSelectedIndex,
	setPaletteSelectedIndex,
} from './constants-client.ts'

import { initKeyboardNav } from './keyboard-nav.ts'

import {
	openCommandPalette,
	closeCommandPalette,
	updatePaletteResults,
	renderPaletteResults,
	executePaletteItem,
} from './palette.ts'

import {
	navigateTo,
	downloadFile,
	initHeaderLinks,
	scrollToAnchor,
	updateTitle,
  hideEmptyHeaders,
} from './utilities.ts'

import { renderExplorer, initResizablePanel } from './explorer.ts'

import { wrapImages } from './image.ts'
import { VaultMapDirectory } from '../../server/types.ts'
import {
	initMobileHeader,
	initSwipeDetection,
	setupCloseOnLinkClick,
} from './mobile.ts'
import { generateToc } from './toc.ts'

declare const vaultMap: VaultMapDirectory

const init = () => {
	scrollToAnchor()
	renderExplorer( vaultMap.children, explorerList, '/', decodeURIComponent(globalThis.location.pathname))
	generateToc()

	initResizablePanel('explorer', 'explorer-handle', 'explorer', 'left')
	initResizablePanel('toc-panel', 'toc-handle', 'toc', 'right')
	initMobileHeader()
	hideEmptyHeaders()
	updateTitle()

	globalThis.history.pushState({}, '', "/$PLACEHOLDER-PATH/")

	setupGlobalKeyboardShortcuts()
	setupCommandPaletteListeners()
	initKeyboardNav()
	setupCloseOnLinkClick()
	setupNavigationHandlers()
	initHeaderLinks()
	initSwipeDetection()

	document.addEventListener('dragstart', evt => evt.preventDefault())
	wrapImages()
}

const setupCommandPaletteListeners = (): void => {
	document
		.getElementById('open-palette-button')
		?.addEventListener('click', openCommandPalette)

	paletteOverlay.addEventListener('click', (e: MouseEvent) => {
		if (e.target === document.getElementById('command-palette')) {
			closeCommandPalette()
		}
	})

	paletteInput.addEventListener('input', (e: Event) =>
		updatePaletteResults((e.target as HTMLInputElement).value)
	)
}

const setupGlobalKeyboardShortcuts = (): void => {
	document.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.ctrlKey && e.key.toLowerCase() === 's') {
			e.preventDefault()
			if (e.shiftKey) {
				downloadFile('/site.zip', 'site.zip')
			} else {
				downloadFile(globalThis.location.pathname)
			}
			return
		}

		if (e.key.toLowerCase() === 'alt') {
			if (!paletteOverlay.classList.contains('hidden')) {
				closeCommandPalette()
				return
			}
			e.preventDefault()
			openCommandPalette()
		}

		if (!paletteOverlay.classList.contains('hidden')) {
			handlePaletteNavigation(e)
		}
	})
}

const handlePaletteNavigation = (e: KeyboardEvent): void => {
	if (e.key === 'Escape') {
		closeCommandPalette()
	} else if (e.key === 'ArrowDown' || e.key === 'j') {
		e.preventDefault()
		setPaletteSelectedIndex(
			(paletteSelectedIndex + 1) % (paletteResults.length || 1)
		)
		renderPaletteResults()
	} else if (e.key === 'ArrowUp' || e.key === 'k') {
		e.preventDefault()
		setPaletteSelectedIndex(
			(paletteSelectedIndex - 1 + (paletteResults.length || 1)) %
				(paletteResults.length || 1)
		)
		renderPaletteResults()
	} else if (e.key === 'Enter' && paletteResults[paletteSelectedIndex]) {
		e.preventDefault()
		executePaletteItem(paletteResults[paletteSelectedIndex])
	}
}

const setupNavigationHandlers = (): void => {
	document.addEventListener('click', (e: MouseEvent) => {
		const link = (e.target as HTMLElement).closest('a')

		if (
			!link ||
			link.hasAttribute('download') ||
			link.target === '_blank'
		) {
			return
		}

		const href = link.getAttribute('href')

		if (!href || href.startsWith('#') || /^[a-z]+:/.test(href)) return

		e.preventDefault()
		navigateTo(href)
	})
}

document.addEventListener('DOMContentLoaded', init)