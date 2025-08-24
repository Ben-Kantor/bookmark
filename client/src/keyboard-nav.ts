import {
	scrollAmount,
	columnIds,
	activeIndex,
	lastFocusedItem,
	cols,
	setActiveIndex,
	setLastFocusedItem,
	setCols,
} from './constants-client.ts'

export const highlightItem = (item: HTMLLIElement | null) => {
	if (lastFocusedItem) {
		lastFocusedItem.classList.remove('keyboard-focus')
		lastFocusedItem
			.querySelector('.keyboard-focus')
			?.classList.remove('keyboard-focus')
	}

	if (!item) {
		setLastFocusedItem(null)
		return
	}

	let focusTarget: HTMLElement | null = null

	if (activeIndex === 0 || activeIndex === 2)
		focusTarget = item.querySelector('a, button')

	focusTarget?.classList.add('keyboard-focus')
	focusTarget?.focus({ preventScroll: true })

	setLastFocusedItem(item)

	const scrollTarget = focusTarget || item.firstElementChild
	scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

export const setActive = (
	newIndex: number,
	mode: 'nav' | 'direct' | 'init' = 'nav'
) => {
	const clamp = (n: number) => Math.max(0, Math.min(columnIds.length - 1, n))

	if (mode === 'nav') {
		const dir = newIndex > activeIndex ? 1 : -1
		let n = activeIndex + dir

		while (n >= 0 && n < cols.length) {
			const p = cols[n] as HTMLElement
			if (
				p &&
				getComputedStyle(p).display !== 'none' &&
				!p.classList.contains('is-empty')
			) {
				newIndex = n
				break
			}
			n += dir
		}
	}

	newIndex = clamp(newIndex)

	if (newIndex === activeIndex) {
		if (newIndex === 1) {
			highlightItem(null)
			document
				.getElementById('content-area')
				?.focus({ preventScroll: true })
		}
		return
	}

	highlightItem(null)
	if (activeIndex !== -1)
		(cols[activeIndex] as HTMLElement)?.classList.remove(
			'keyboard-active-column'
		)

	setActiveIndex(newIndex)

	const newCol = cols[newIndex] as HTMLElement
	newCol.classList.add('keyboard-active-column')

	if (newIndex === 1)
		document.getElementById('content-area')?.focus({ preventScroll: true })
	else newCol.focus({ preventScroll: true })
}

export const initPanelFocus = () => {
	if (activeIndex === 0) {
		const li =
			cols[0]?.querySelector<HTMLLIElement>('.active-file-row') ||
			cols[0]?.querySelector<HTMLLIElement>('li')
		if (li) highlightItem(li)
	}

	if (activeIndex === 2) {
		const li =
			cols[2]?.querySelector<HTMLLIElement>('li.keyboard-focus') ||
			cols[2]?.querySelector<HTMLLIElement>('li')
		if (li) highlightItem(li)
	}
}

const navigatePanel = (dir: 'up' | 'down') => {
	if (activeIndex === 1) return

	const panel = cols[activeIndex] as HTMLElement
	if (!panel) return

	const items = Array.from(panel.querySelectorAll('li')).filter(
		el => el.offsetParent
	)

	if (!items.length) return

	const i =
		lastFocusedItem && items.includes(lastFocusedItem as HTMLLIElement)
			? items.indexOf(lastFocusedItem as HTMLLIElement)
			: -1

	const ni =
		dir === 'down'
			? (i + 1) % items.length
			: (i - 1 + items.length) % items.length

	highlightItem(items[ni])
}

export const handleKeyDown = (e: KeyboardEvent) => {
	const t = e.target as HTMLElement
	if (
		/INPUT|TEXTAREA/.test(t.tagName) ||
		e.isComposing ||
		e.ctrlKey ||
		e.altKey ||
		e.metaKey
	)
		return

	let handled = false

	if (e.key === 'ArrowLeft') {
		setActive(activeIndex - 1, 'nav')
		handled = true
	} else if (e.key === 'ArrowRight') {
		setActive(activeIndex + 1, 'nav')
		handled = true
	} else if (activeIndex !== -1) {
		const activeEl = document.activeElement as HTMLElement
		const li =
			(activeEl.closest('li') as HTMLLIElement) || lastFocusedItem || null

		if (
			!lastFocusedItem &&
			(e.key === 'ArrowUp' || e.key === 'ArrowDown')
		) {
			initPanelFocus()
			if (e.key === 'ArrowUp') navigatePanel('down')
			if (e.key === 'ArrowDown') navigatePanel('up')
		}

		switch (e.key) {
			case 'ArrowUp':
				if (activeIndex === 1) {
					highlightItem(null)
					document
						.getElementById('content-area')
						?.scrollBy({ top: -scrollAmount, behavior: 'smooth' })
				} else {
					navigatePanel('up')
				}
				handled = true
				break

			case 'ArrowDown':
				if (activeIndex === 1) {
					highlightItem(null)
					document
						.getElementById('content-area')
						?.scrollBy({ top: scrollAmount, behavior: 'smooth' })
				} else {
					navigatePanel('down')
				}
				handled = true
				break

			case 'Enter':
				if (activeIndex === 0) activeEl?.click()
				else if (activeIndex === 2 && li)
					li.querySelector<HTMLAnchorElement>('a')?.click()
				else handled = false
				break

			case ' ':
				e.preventDefault()
				if (activeIndex === 2 && li) {
					li.querySelector<HTMLElement>(
						'.toc-toggle,button,summary'
					)?.click()
					setTimeout(() => {
						if (document.body.contains(li)) highlightItem(li)
					}, 0)
				} else if (activeIndex === 0 && li) {
					li.querySelector<HTMLButtonElement>('button')?.click()
					highlightItem(li)
				} else handled = false
				break

			default:
				handled = false
		}
	}

	if (handled) e.preventDefault()
}

export const initKeyboardNav = () => {
	setCols(columnIds.map(id => document.getElementById(id)))
	if (cols.some(c => !c)) return

	cols.forEach(c => c?.setAttribute('tabindex', '-1'))

	document.addEventListener('keydown', handleKeyDown)

	setActive(1, 'init')
}
