import {
	paletteInput,
	paletteOverlay,
	paletteResults,
	paletteSelectedIndex,
	setPaletteSelectedIndex,
} from './constants.ts'

import { initKeyboardNav } from './keyboard-nav.ts'

import {
	closeCommandPalette,
	executePaletteItem,
	openCommandPalette,
	renderPaletteResults,
	updatePaletteResults,
} from './palette.ts'

import {
	downloadFile,
	hideEmptyHeaders,
	initHeaderLinks,
	navigateTo,
	scrollToAnchor,
	updateTitle,
} from './utilities.ts'

import { initExplorer } from './explorer.ts'
import { wrapImages } from './image.ts'

import { initMobileHeader, initSwipeDetection, setupCloseOnLinkClick } from './mobile.ts'

import { generateToc } from './toc.ts'

const init = async (): Promise<void> => {
	scrollToAnchor()
	generateToc()
	initExplorer()
	initHeaderLinks()
	updateTitle()

	await wrapImages()

	setupGlobalKeyboardShortcuts()
	setupCommandPaletteListeners()
	setupNavigationHandlers()
	initKeyboardNav()
	initMobileHeader()
	setupCloseOnLinkClick()
	initSwipeDetection()
	hideEmptyHeaders()
	preventDragging()
}

const setupCommandPaletteListeners = (): void => {
	document
		.getElementById('open-palette-button')
		?.addEventListener('click', openCommandPalette)
	paletteOverlay.addEventListener('click', (e: MouseEvent) => {
		if (e.target === document.getElementById('command-palette'))
			closeCommandPalette()
	})
	paletteInput.addEventListener(
		'input',
		(e: Event) => updatePaletteResults((e.target as HTMLInputElement).value),
	)
}

const setupGlobalKeyboardShortcuts = (): void => {
	document.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.ctrlKey && e.key === 'S') {
			e.preventDefault()
			if (e.shiftKey)
				downloadFile('/site.zip', 'site.zip')
			else
				downloadFile(globalThis.location.pathname)
			return
		}
		if (e.key === 'Escape') {
			if (!paletteOverlay.classList.contains('hidden')) {
				closeCommandPalette()
				return
			}
			e.preventDefault()
			openCommandPalette()
			return
		}
		if (!paletteOverlay.classList.contains('hidden'))
			handlePaletteNavigation(e)
	})
}

const handlePaletteNavigation = (e: KeyboardEvent): void => {
	if (e.key === 'Escape')
		closeCommandPalette()
	else if (e.key === 'ArrowDown' || e.key === 'j') {
		e.preventDefault()
		setPaletteSelectedIndex(
			(paletteSelectedIndex + 1) % (paletteResults.length || 1),
		)
		renderPaletteResults()
	} else if (e.key === 'ArrowUp' || e.key === 'k') {
		e.preventDefault()
		setPaletteSelectedIndex(
			(paletteSelectedIndex - 1 + (paletteResults.length || 1)) %
				(paletteResults.length || 1),
		)
		renderPaletteResults()
	} else if (e.key === 'Enter' && paletteResults[paletteSelectedIndex]) {
		e.preventDefault()
		executePaletteItem(paletteResults[paletteSelectedIndex])
	}
}

const setupNavigationHandlers = (): void => {
	globalThis.document.addEventListener('click', (e) => {
		const link = (e.target as HTMLElement).closest('a')

		if (!link || link.hasAttribute('download') || link.target === '_blank')
			return
		const href = link.getAttribute('href')

		if (
			!href || href.startsWith('mailto:') || href.startsWith('tel:') ||
			/^[a-z]+:/.test(href)
		) { return }

		const currentUrl = new globalThis.URL(globalThis.location.href)
		const targetUrl = new globalThis.URL(href, currentUrl)

		if (
			currentUrl.origin === targetUrl.origin &&
			currentUrl.pathname === targetUrl.pathname &&
			currentUrl.hash !== targetUrl.hash
		) { return }

		e.preventDefault()
		navigateTo(targetUrl.pathname + targetUrl.hash, false)
	})

	globalThis.addEventListener('popstate', () => {
		const currentUrl = globalThis.location.pathname + globalThis.location.hash
		navigateTo(currentUrl, true)
	})
}

const preventDragging = (): void => {
	globalThis.document.addEventListener(
		'dragstart',
		(evt) => evt.preventDefault(),
	)
}

//document.addEventListener('DOMContentLoaded', init)

init()
