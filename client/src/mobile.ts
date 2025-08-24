import { openCommandPalette } from './palette.ts'

const get = (id: string) => document.getElementById(id)

export function closePanels() {
	const explorer = get('explorer')
	const toc = get('toc-panel')
	const overlay = get('mobile-overlay')
	if (!explorer || !toc || !overlay) return

	explorer.classList.remove('visible')
	toc.classList.remove('visible')
	overlay.style.opacity = '0'
	overlay.style.pointerEvents = 'none'
}

export function initMobileHeader() {
	const explorer = get('explorer')
	const toc = get('toc-panel')

	if (!get('mobile-overlay')) {
		const overlay = document.createElement('div')
		overlay.id = 'mobile-overlay'
		overlay.classList.add('overlay')
		overlay.style.opacity = '0'
		document.body.appendChild(overlay)
		overlay.addEventListener('click', closePanels)
	}

	const overlay = get('mobile-overlay')!

	const openExplorer = (e: Event) => {
		e.preventDefault()
		explorer?.classList.remove('panel-collapsed')
		explorer?.classList.add('visible')
		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}

	const openToc = (e: Event) => {
		e.preventDefault()
		toc?.classList.remove('panel-collapsed')
		toc?.classList.add('visible')
		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}

	const openPalette = (e: Event) => {
		e.preventDefault()
		openCommandPalette()
	}

	get('mobile-explorer-button')?.addEventListener('click', openExplorer)
	get('mobile-explorer-button')?.addEventListener(
		'touchstart',
		openExplorer,
		{ passive: false }
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

export function setupCloseOnLinkClick() {
	const handleLinkClick = (e: MouseEvent) => {
		if (e.target instanceof Element && e.target.closest('a')) closePanels()
	}

	get('explorer')?.addEventListener('click', handleLinkClick)
	get('toc-panel')?.addEventListener('click', handleLinkClick)
}

export function initSwipeDetection() {
	const handlers = { onSwipeLeft: swipeLeft, onSwipeRight: swipeRight }
	let touchStartX = 0
	let touchStartY = 0
	let startTarget: Element | null = null

	const isScrollable = (el: Element) => {
		const { overflowX, overflowY } = getComputedStyle(el)
		return {
			vertical:
				(overflowY === 'scroll' || overflowY === 'auto') &&
				el.scrollHeight > el.clientHeight,
			horizontal:
				(overflowX === 'scroll' || overflowX === 'auto') &&
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

	const handleTouchStart = (e: TouchEvent) => {
		if (e.touches.length > 1) return
		const { clientX, clientY } = e.touches[0]
		touchStartX = clientX
		touchStartY = clientY
		startTarget = e.target as Element
	}

	const handleTouchEnd = (e: TouchEvent) => {
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

function swipeLeft() {
	const explorer = get('explorer')!
	const toc = get('toc-panel')!
	const overlay = get('mobile-overlay')!

	if (explorer.classList.contains('visible')) {
		explorer.classList.remove('visible')
		if (!toc.classList.contains('visible')) {
			overlay.style.opacity = '0'
			overlay.style.pointerEvents = 'none'
		}
	} else if (!toc.classList.contains('visible')) {
		toc.classList.add('visible')
		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}
}

function swipeRight() {
	const explorer = get('explorer')!
	const toc = get('toc-panel')!
	const overlay = get('mobile-overlay')!

	if (toc.classList.contains('visible')) {
		toc.classList.remove('visible')
		if (!explorer.classList.contains('visible')) {
			overlay.style.opacity = '0'
			overlay.style.pointerEvents = 'none'
		}
	} else if (!explorer.classList.contains('visible')) {
		explorer.classList.add('visible')
		overlay.style.opacity = '1'
		overlay.style.pointerEvents = 'auto'
	}
}
