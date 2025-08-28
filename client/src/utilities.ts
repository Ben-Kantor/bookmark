import { VaultMapDirectory } from '../../server/types.ts'
import {
	mainContentEl,
	explorerList,
	tocList,
	toTitleCase,
	activeIndex,
} from './constants-client.ts'
import { wrapImages } from './image.ts'
import { highlightItem } from './keyboard-nav.ts'
import { renderExplorer } from './explorer.ts'
import { generateToc } from './toc.ts'

declare const vaultMap: VaultMapDirectory

export const navigateTo = (targetURL: string, forceRedirect?: boolean): void  => {
	highlightItem(null)

	const url = new URL(targetURL, globalThis.location.origin)
	const path = url.pathname
	const anchor = url.hash.substring(1)

	if (globalThis.location.pathname.endsWith(path) && !forceRedirect) {
		requestAnimationFrame(() => {
			document.getElementById(anchor)?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		})
		return
	}

	fetch(path)
		.then(response => {
			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			globalThis.history.pushState(
				{},
				'',
				response.headers.get('X-Redirect-URL')
			)

			return response.text()
		})
		.then(html => {
			const parser = new DOMParser()
			const doc = parser.parseFromString(html, 'text/html')
			const newMainContent = doc.querySelector('main.content')?.innerHTML
			const newTitle = doc.querySelector('title')?.textContent || 'Page'

			if (newMainContent) mainContentEl.innerHTML = newMainContent
			document.title = newTitle

			explorerList.innerHTML = ''
			renderExplorer(
				vaultMap.children,
				explorerList,
				'/',
				decodeURIComponent(path)
			)

			tocList.innerHTML = ''
			generateToc()

			initHeaderLinks()
			updateTitle()
			scrollToAnchor()
			wrapImages()

			if (activeIndex === 0) {
				const newActiveItem =
					explorerList.querySelector<HTMLLIElement>(
						'.active-file-row'
					)
				if (newActiveItem) highlightItem(newActiveItem)
			}
		})
		.catch(error => {
			console.error('Error fetching page content:', error)
			globalThis.location.href = targetURL
		})
}

export const downloadFile = (path: string, downloadName?: string): void  => {
	const a = document.createElement('a')
	a.href = downloadName ? path : `/!/${path}`
	a.download = downloadName || decodeURIComponent(path.split('/').pop() || '')
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
}

export const initHeaderLinks = (): void  => {
	const headers = document.querySelectorAll<HTMLElement>(
		'h1, h2, h3, h4, h5, h6'
	)

	headers.forEach(header => {
		header.classList.add('clickable-header')

		const handleHeaderCopy = async (event: Event) => {
			event.preventDefault()

			const url = `${globalThis.location.origin}${
				globalThis.location.pathname
			}#${encodeURIComponent(header.textContent || '')}`

			try {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					await navigator.clipboard.writeText(url)
				} else {
					const textArea = document.createElement('textarea')
					textArea.value = url
					document.body.appendChild(textArea)
					textArea.select()
					document.execCommand('copy')
					document.body.removeChild(textArea)
				}

				header.classList.add('copied')
				setTimeout(() => header.classList.remove('copied'), 200)
			} catch (err) {
				console.error('Failed to copy link: ', err)
			}
		}

		header.addEventListener('click', handleHeaderCopy)
		header.addEventListener('touchend', handleHeaderCopy, {
			passive: false,
		})
	})
}

export const scrollToAnchor = (): void  => {
	const scrollContainer = document.getElementsByTagName('main')[0]!
	const hash = globalThis.location.hash

	if (!hash || hash === '#') {
		setTimeout(() => scrollContainer.scrollTo({ top: 0 }), 10)
		return
	}

	requestAnimationFrame(() => {
		try {
			const decodedAndEscapedHash =
				'#' + CSS.escape(decodeURIComponent(hash).substring(1))
			const targetElement = scrollContainer.querySelector(
				decodedAndEscapedHash
			)
			if (targetElement) {
				targetElement.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				})
				return
			}
		} catch (e) {
			console.error(`Error scrolling to anchor "${hash}":`, e)
			scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
}

export const titleFromMarkdown = (markdown: string): string | undefined  => {
	return markdown.match(/\A#\s(.+)\n/)?.[1]
}

export const updateTitle = (): void  => {
	document.title =
		document.querySelector('h1')?.textContent ||
		toTitleCase(
			decodeURI(
				globalThis.location.href
					.split('/')
					.pop()
					?.split('.')[0]
					.split('#')[0] || ''
			)
			//@ts-ignore constant defined in another codeblcok
		) || document.querySelector('meta[property="og:title"]')?.content
}

export const lastOnlyChild = (el: Element): Element  => {
	return el.children.length > 1 ? el : lastOnlyChild(el.children[0])
}

//currently unused, intended for a feature that automatically enables line wrapping when much of a codeblock is cut off
export const checkLineWrapping = (embeddedHTML: string): boolean => {
	const textContent = embeddedHTML.replace(/<[^>]*>/g, '')
	const overflowCharacters = textContent
		.split('\n')
		.map(line => Math.max(0, line.length - 80))
		.reduce((a, b) => a + b, 0)
	return overflowCharacters > textContent.length / 4
}

export const hideEmptyHeaders = () => {
  const tables = document.querySelectorAll('.content table')
  tables.forEach(table => {
    const header = table.querySelector('thead')
    if (header) {
      const headerText = header?.textContent?.trim()
      if (headerText === '') {
        header.style.display = 'none'
      }
    }
  })
	
}