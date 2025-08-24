import {
	FileTypeIcons,
	VaultMap,
	VaultMapDirectory,
	VaultMapFile,
} from '../../server/types.ts'

import { expandedFolders } from './constants-client.ts'

declare const fileTypeIcons: FileTypeIcons

export function renderExplorer(
	items: VaultMap[],
	parentEl: HTMLUListElement,
	pathPrefix: string = '/',
	activePath: string
): void {
	const dirs: VaultMapDirectory[] = items
		.filter((i): i is VaultMapDirectory => i.dir)
		.sort((a, b) => a.name.localeCompare(b.name))

	const files: VaultMapFile[] = items
		.filter((i): i is VaultMapFile => !i.dir)
		.sort((a, b) => a.name.localeCompare(b.name))

	for (const item of [...dirs, ...files]) {
		if (item.name.startsWith('.')) continue

		const li: HTMLLIElement = document.createElement('li')
		li.className = 'rounded p-0'
		li.setAttribute('role', 'treeitem')

		item.dir
			? renderExplorerDir(item, li, pathPrefix, activePath)
			: renderExplorerFile(item, li, pathPrefix, activePath)

		parentEl.appendChild(li)
	}
}

export function initResizablePanel(
	panelId: string,
	handleId: string,
	storageKey: string,
	direction: string
): void {
	const panel: HTMLElement = document.getElementById(panelId)!
	const handle: HTMLElement = document.getElementById(handleId)!
	const collapsedKey: string = `${storageKey}Collapsed`
	const widthKey: string = `${storageKey}Width`

	const initialCollapsedClass: string = `${storageKey}-is-collapsed-initial`
	if (document.documentElement.classList.contains(initialCollapsedClass)) {
		panel.classList.add('panel-collapsed')
		document.documentElement.classList.remove(initialCollapsedClass)
	}

	handle.onmousedown = (e: MouseEvent) => {
		e.preventDefault()

		const startX: number = e.clientX
		const initialWidth: number = panel.offsetWidth
		let isClick: boolean = true

		panel.classList.remove('panel-transitions')

		globalThis.document.body.style.cursor = 'col-resize'
		globalThis.document.body.style.userSelect = 'none'

		const onMouseMove = (moveE: MouseEvent) => {
			if (isClick && Math.abs(moveE.clientX - startX) > 5) isClick = false
			if (isClick) return

			panel.classList.remove('panel-collapsed')

			const deltaX: number =
				direction === 'left'
					? moveE.clientX - startX
					: startX - moveE.clientX

			const newWidth: number = Math.max(
				0,
				Math.min(600, initialWidth + deltaX)
			)

			panel.style.width = `${newWidth}px`
		}

		const onMouseUp = () => {
			globalThis.document.removeEventListener('mousemove', onMouseMove)
			globalThis.document.removeEventListener('mouseup', onMouseUp)

			globalThis.document.body.style.cursor = ''
			globalThis.document.body.style.userSelect = ''

			panel.classList.add('panel-transitions')

			if (isClick) {
				const isCollapsed: boolean =
					panel.classList.contains('panel-collapsed')

				if (isCollapsed) {
					panel.classList.remove('panel-collapsed')

					const savedWidth: string =
						globalThis.localStorage.getItem(widthKey) || '256'

					panel.style.width = `${savedWidth}px`
					globalThis.localStorage.setItem(collapsedKey, 'false')
				} else {
					globalThis.localStorage.setItem(
						widthKey,
						panel.offsetWidth.toString()
					)
					panel.classList.add('panel-collapsed')
					globalThis.localStorage.setItem(collapsedKey, 'true')
				}
			} else {
				const finalWidth: number = panel.offsetWidth
				if (finalWidth > 60) {
					globalThis.localStorage.setItem(
						widthKey,
						finalWidth.toString()
					)
					globalThis.localStorage.setItem(collapsedKey, 'false')
				} else {
					panel.classList.add('panel-collapsed')
					globalThis.localStorage.setItem(collapsedKey, 'true')
				}
			}
		}

		globalThis.document.addEventListener('mousemove', onMouseMove)
		globalThis.document.addEventListener('mouseup', onMouseUp)
	}
}

function renderExplorerDir(
	item: VaultMapDirectory,
	li: HTMLLIElement,
	pathPrefix: string,
	activePath: string
): void {
	const folderPath: string = `${pathPrefix}${item.name}/`
	const isExpanded: boolean =
		activePath.startsWith(folderPath) ||
		expandedFolders[folderPath] ||
		false

	const hasChildren: boolean = item.children.length > 0
	const folderId: string = `folder-contents-${folderPath.replace(
		/[^a-zA-Z0-9]/g,
		'-'
	)}`

	li.classList.add('folder')
	if (isExpanded) li.classList.add('expanded')
	li.setAttribute('aria-expanded', String(isExpanded))

	const icon: string = hasChildren
		? isExpanded
			? fileTypeIcons['folder-open']
			: fileTypeIcons['folder-closed']
		: fileTypeIcons['folder-childless']

	const button: HTMLButtonElement = document.createElement('button')
	button.className = 'flex gap-2 w-full text-left'
	button.style.paddingLeft = '0'
	button.innerHTML =
		`<span class="pl-[0.5em] icon w-6 text-center">${icon || ''}</span>` +
		`<span class="truncate">${item.name}</span>`

	button.setAttribute('aria-expanded', String(isExpanded))
	if (hasChildren) button.setAttribute('aria-controls', folderId)

	button.onclick = (e: MouseEvent) => {
		e.preventDefault()

		const isNowExpanded: boolean = li.classList.toggle('expanded')
		li.setAttribute('aria-expanded', String(isNowExpanded))
		button.setAttribute('aria-expanded', String(isNowExpanded))

		const childUl = li.querySelector('ul') as HTMLUListElement
		childUl.style.display = isNowExpanded ? 'block' : 'none'

		expandedFolders[folderPath] = isNowExpanded
		globalThis.localStorage.setItem(
			'explorerFolders',
			JSON.stringify(expandedFolders)
		)

		const iconSpan = button.querySelector('.icon') as HTMLSpanElement
		if (hasChildren && iconSpan) {
			iconSpan.textContent = isNowExpanded
				? fileTypeIcons['folder-open'] || ''
				: fileTypeIcons['folder-closed'] || ''
		}
	}

	li.appendChild(button)

	const ul: HTMLUListElement = document.createElement('ul')
	ul.id = folderId
	ul.setAttribute('role', 'group')
	if (!isExpanded) ul.style.display = 'none'

	renderExplorer(item.children, ul, folderPath, activePath)
	li.appendChild(ul)
}

function renderExplorerFile(
	item: VaultMapFile,
	li: HTMLLIElement,
	pathPrefix: string,
	activePath: string
): void {
	const fullPath: string = `${pathPrefix}${item.name}`
	const isActive: boolean = decodeURIComponent(fullPath) === activePath
	const extension: string = item.name.split('.').pop() || ''
	const displayName: string = item.title || item.name

	const iconChar: string =
		fileTypeIcons[extension.toLowerCase()] ?? fileTypeIcons.default

	const anchor: HTMLAnchorElement = document.createElement('a')
	anchor.href = encodeURI(fullPath)
	anchor.className =
		`flex items-center w-full hover:text-[var(--text-accent)]` +
		`${iconChar ? ' gap-2' : ''}` +
		`${isActive ? ' active-file font-bold' : ''}`

	anchor.style.paddingLeft = '0'
	anchor.innerHTML =
		(iconChar
			? `<span class="pl-[0.5em] icon w-6 text-center">${iconChar}</span>`
			: '&nbsp;&nbsp;') + `<span class="truncate">${displayName}</span>`

	if (isActive) {
		anchor.setAttribute('aria-current', 'page')
		li.classList.add('active-file-row')
	}

	li.appendChild(anchor)
}
