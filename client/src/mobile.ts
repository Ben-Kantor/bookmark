import { openCommandPalette } from './palette.ts'

const get = (id: string): HTMLElement | null => document.getElementById(id)

export const closePanels = (): void => {
	const explorer = get('explorer')
	const toc = get('toc-panel')
	const overlay = get('mobile-overlay')
	if (!explorer || !toc || !overlay) return

	explorer.classList.remove('visible')
	toc.classList.remove('visible')
	overlay.style.opacity = '0'
	overlay.style.pointerEvents = 'none'
}

export const initMobileHeader = (): void => {
	const explorer = get('explorer')!
	const toc = get('toc-panel')!

	if (!get('mobile-overlay')) {
		const overlay = document.createElement('div')
		overlay.id = 'mobile-overlay'
		overlay.classList.add('overlay')
		overlay.style.opacity = '0'
		document.body.appendChild(overlay)
		overlay.addEventListener('click', closePanels)
	}

	const overlay = get('mobile-overlay')!

	const openExplorer = (e: Event): void => {
		e.preventDefault()
		explorer.classList.remove('panel-collapsed')
		explorer.classList.add('visible')

		if (globalThis.innerWidth <= 768)
			explorer.style.width = '80%'

		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}

	const openToc = (e: Event): void => {
		e.preventDefault()
		toc.classList.remove('panel-collapsed')
		toc.classList.add('visible')

		if (globalThis.innerWidth <= 768)
			toc.style.width = '80%'

		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}

	const openPalette = (e: Event): void => {
		e.preventDefault()
		openCommandPalette()
	}

	get('mobile-explorer-button')?.addEventListener('click', openExplorer)
	get('mobile-explorer-button')?.addEventListener(
		'touchstart',
		openExplorer,
		{ passive: false },
	)

	get('mobile-toc-button')?.addEventListener('click', openToc)
	get('mobile-toc-button')?.addEventListener('touchstart', openToc, {
		passive: false,
	})

	get('mobile-palette-button')?.addEventListener('click', openPalette)
	get('mobile-palette-button')?.addEventListener('touchstart', openPalette, {
		passive: false,
	})
}

export const setupCloseOnLinkClick = (): void => {
	const handleLinkClick = (e: MouseEvent) => {
		if (e.target instanceof Element && e.target.closest('a')) closePanels()
	}

	get('explorer')?.addEventListener('click', handleLinkClick)
	get('toc-panel')?.addEventListener('click', handleLinkClick)
}

export const initSwipeDetection = (): void => {
	const handlers = { onSwipeLeft: swipeLeft, onSwipeRight: swipeRight }
	let touchStartX = 0
	let touchStartY = 0
	let startTarget: Element | null = null

	const isScrollable = (el: Element) => {
		const { overflowX, overflowY } = getComputedStyle(el)
		return {
			vertical: (overflowY === 'scroll' || overflowY === 'auto') &&
				el.scrollHeight > el.clientHeight,
			horizontal: (overflowX === 'scroll' || overflowX === 'auto') &&
				el.scrollWidth > el.clientWidth,
		}
	}
	try {
		//@ts-ignore lightbox is created in js embedded in the html
		if (lightbox?.pswp) return
	} catch {
		/* lightbox not active, ignore */
	}

	const findScrollableParent = (el: Element | null): Element | null => {
		let cur = el
		while (cur && cur !== document.documentElement) {
			if (cur.id === 'toc-panel' || cur.id === 'explorer') {
				cur = cur.parentElement
				continue
			}
			if (cur.closest('#toc-panel') || cur.closest('#explorer')) {
				cur = cur.parentElement
				continue
			}
			const s = isScrollable(cur)
			if (s.vertical || s.horizontal) return cur
			cur = cur.parentElement
		}
		return null
	}

	const handleTouchStart = (e: TouchEvent): void => {
		if (e.touches.length > 1) return
		const { clientX, clientY } = e.touches[0]
		touchStartX = clientX
		touchStartY = clientY
		startTarget = e.target as Element
	}

	const handleTouchEnd = (e: TouchEvent): void => {
		if (e.changedTouches.length > 1) return

		const { clientX, clientY } = e.changedTouches[0]
		const dx = clientX - touchStartX
		const dy = clientY - touchStartY

		const scrollableParent = findScrollableParent(startTarget)
		if (scrollableParent) {
			const s = isScrollable(scrollableParent)
			const vertical = Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30
			const horizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30
			if ((s.vertical && vertical) || (s.horizontal && horizontal)) return
		}

		const onPanel = startTarget?.closest('#toc-panel, #explorer')
		const minDist = onPanel ? 30 : 50
		const maxVRatio = onPanel ? 1.5 : 1

		if (Math.abs(dx) < minDist) return
		if (Math.abs(dy) > Math.abs(dx) * maxVRatio) return

		dx > 0 ? handlers.onSwipeRight?.() : handlers.onSwipeLeft?.()
	}

	document.addEventListener('touchstart', handleTouchStart, { passive: true })
	document.addEventListener('touchend', handleTouchEnd, { passive: true })
}

const swipeLeft = (): void => {
	const explorer = get('explorer')!
	const toc = get('toc-panel')!
	const overlay = get('mobile-overlay')!

	if (explorer.classList.contains('visible'))
		closePanels()
	else if (!toc.classList.contains('visible')) {
		toc.classList.add('visible')
		toc.classList.remove('panel-collapsed')
		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}
}

const swipeRight = (): void => {
	const explorer = get('explorer')!
	const toc = get('toc-panel')!
	const overlay = get('mobile-overlay')!

	if (toc.classList.contains('visible')) {
		closePanels()
		if (!explorer.classList.contains('visible')) {
			overlay.style.opacity = '0'
			overlay.style.pointerEvents = 'none'
		}
	} else if (!explorer.classList.contains('visible')) {
		explorer.classList.add('visible')
		explorer.classList.remove('panel-collapsed')
		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}
}
