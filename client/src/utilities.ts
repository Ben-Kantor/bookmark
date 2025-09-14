import { activeIndex, mainContentEl, tocList, toTitleCase } from './constants-client.ts'
import { wrapImages } from './image.ts'
import { highlightItem } from './keyboard-nav.ts'
import { updateExplorerState } from './explorer.ts'
import { generateToc } from './toc.ts'

export const navigateTo = async (
    targetURL: string,
    historyNav: boolean = false,
): Promise<void> => {
    highlightItem(null)

    const url = new URL(targetURL, globalThis.location.origin)
    const path = url.pathname
    const hash = url.hash

    if (globalThis.location.pathname === path && !historyNav) {
        if (!historyNav)
            globalThis.history.pushState({}, '', targetURL)
        requestAnimationFrame(() => {
            scrollToAnchor()
        })
        return
    }

    const response = await globalThis.fetch(path)

    if (!response) {
        alert('Failed to fetch page content\nPlease report this issue to the developers.')
        throw new Error('Failed to fetch page content')
    }

    if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`)

    const html = await response.text()
    const parser = new globalThis.DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    if (!historyNav) {
        globalThis.history.pushState(
            {},
            '',
            response.headers.get('X-Redirect-URL') || path + hash,
        )
    }

    const mainContent = doc.querySelector('main.content')
    const newMainContentHtml = mainContent?.innerHTML
    if (!newMainContentHtml) throw new Error('No main content found in response')

    if (mainContentEl && newMainContentHtml)
        mainContentEl.innerHTML = newMainContentHtml

    updateExplorerState(decodeURIComponent(path))

    if (tocList) {
        tocList.innerHTML = ''
        generateToc()
    }

    if (hash)
        scrollToAnchor()
    else
        globalThis.document.getElementsByTagName('main')[0]?.scrollTo({ top: 0 })

    initHeaderLinks()
    updateTitle()
    await wrapImages()

    if (activeIndex === 0) {
        const newActiveItem = document.querySelector('.active-file-row')
        if (newActiveItem) highlightItem(newActiveItem as HTMLLIElement)
    }
}

export const downloadFile = (path: string, downloadName?: string): void => {
    const a = document.createElement('a')
    a.href = downloadName ? path : `/!/${path}`
    a.download = downloadName || decodeURIComponent(path.split('/').pop() || '')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export const initHeaderLinks = (): void => {
    const headers = document.querySelectorAll<HTMLElement>(
        'h1, h2, h3, h4, h5, h6',
    )

    headers.forEach((header) => {
        header.classList.add('clickable-header')

        const handleHeaderCopy = async (event: Event) => {
            event.preventDefault()

            const url = `${globalThis.location.origin}${globalThis.location.pathname}#${
                encodeURIComponent(header.textContent || '')
            }`

            try {
                if (navigator.clipboard && navigator.clipboard.writeText)
                    await navigator.clipboard.writeText(url)
                else {
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

export const scrollToAnchor = (): void => {
    const scrollContainer = document.getElementsByTagName('main')[0]!
    const hash = globalThis.location.hash

    if (!hash || hash === '#')
        return

    requestAnimationFrame(() => {
        try {
            const decodedAndEscapedHash = '#' +
                CSS.escape(decodeURIComponent(hash).substring(1))
            const targetElement = scrollContainer.querySelector(
                decodedAndEscapedHash,
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

export const titleFromMarkdown = (markdown: string): string | undefined => {
    return markdown.match(/\A#\s(.+)\n/)?.[1]
}

export const updateTitle = (): void => {
    const h1Title = document.querySelector('h1')?.textContent
    const pathTitle = toTitleCase(
        decodeURI(
            globalThis.location.pathname.split('/').pop()?.split('.')[0]?.split(
                '#',
            )[0] || '',
        ),
    )
    const metaTitle = document.querySelector('meta[property="og:title"]')
        ?.getAttribute('content')

    document.title = h1Title || pathTitle || metaTitle || ''
}

export const lastOnlyChild = (el: Element): Element => {
    return el.children.length > 1 ? el : lastOnlyChild(el.children[0])
}

export const hideEmptyHeaders = (): void => {
    const tables = document.querySelectorAll('.content table')
    tables.forEach((table) => {
        const header = table.querySelector('thead')
        if (header) {
            const headerText = header?.textContent?.trim()
            if (headerText === '')
                header.style.display = 'none'
        }
    })
}
