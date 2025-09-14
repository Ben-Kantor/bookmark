import {
  expandedFolders,
  FOLDER_CLOSED_ICON,
  FOLDER_OPEN_ICON,
} from './constants-client.ts'

export const updateExplorerState = (activePath: string): void => {
  // Reset currently active file
  const currentActiveFile = document.querySelector('.active-file-row')
  if (currentActiveFile) {
    currentActiveFile.classList.remove('active-file-row')
    const link = currentActiveFile.querySelector('a')
    if (link) {
      link.classList.remove('active-file', 'font-bold')
      link.removeAttribute('aria-current')
    }
  }

  // Reset all expanded folders that are not in local storage
  const expandedFolderElements = document.querySelectorAll('.folder.expanded')
  expandedFolderElements.forEach((folder) => {
    const path = folder.querySelector('button')?.dataset.folderPath
    if (path && !expandedFolders[path]) {
      folder.classList.remove('expanded')
      folder.setAttribute('aria-expanded', 'false')
      const ul = folder.querySelector('ul')
      if (ul) ul.style.display = 'none'
      const icon = folder.querySelector('.icon')
      if (icon) icon.textContent = FOLDER_CLOSED_ICON
    }
  })

  // Set new active file - try multiple path formats to ensure matching
  let newActiveLink = document.querySelector(`a[href="${encodeURI(activePath)}"]`) as HTMLElement

  // If not found, try without encoding
  if (!newActiveLink) {
    newActiveLink = document.querySelector(`a[href="${activePath}"]`) as HTMLElement
  }

  // If still not found, try with .md extension removed
  if (!newActiveLink && activePath.endsWith('.md')) {
    const pathWithoutMd = activePath.replace(/\.md$/, '')
    newActiveLink = document.querySelector(`a[href="${encodeURI(pathWithoutMd)}"]`) as HTMLElement
    if (!newActiveLink) {
      newActiveLink = document.querySelector(`a[href="${pathWithoutMd}"]`) as HTMLElement
    }
  }

  // If still not found, try adding .md extension
  if (!newActiveLink && !activePath.endsWith('.md')) {
    const pathWithMd = activePath + '.md'
    newActiveLink = document.querySelector(`a[href="${encodeURI(pathWithMd)}"]`) as HTMLElement
    if (!newActiveLink) {
      newActiveLink = document.querySelector(`a[href="${pathWithMd}"]`) as HTMLElement
    }
  }

  if (newActiveLink) {
    const parentLi = newActiveLink.parentElement
    if (parentLi) {
      parentLi.classList.add('active-file-row')
      newActiveLink.classList.add('active-file', 'font-bold')
      newActiveLink.setAttribute('aria-current', 'page')
    }

    // Expand parent folders
    let current = newActiveLink.parentElement
    while (current) {
      current = current.closest('.folder')
      if (current) {
        if (!current.classList.contains('expanded')) {
          current.classList.add('expanded')
          current.setAttribute('aria-expanded', 'true')
          const ul = current.querySelector('ul')
          if (ul) ul.style.display = 'block'
          const icon = current.querySelector('.icon')
          if (icon) icon.textContent = FOLDER_OPEN_ICON
        }
        current = current.parentElement
      }
    }
  }
}

const setupExplorerEventDelegation = (explorerList: HTMLUListElement): void => {
  explorerList.addEventListener('click', (e: MouseEvent) => {
    const button = (e.target as Element).closest(
      'button[data-folder-path]',
    ) as HTMLButtonElement
    if (!button) return

    e.preventDefault()

    const folderPath = button.dataset.folderPath!
    const li = button.closest('li')!
    const ul = li.querySelector('ul')!
    const iconSpan = button.querySelector('.icon')!

    const isNowExpanded = li.classList.toggle('expanded')
    li.setAttribute('aria-expanded', String(isNowExpanded))
    button.setAttribute('aria-expanded', String(isNowExpanded))
    ul.style.display = isNowExpanded ? 'block' : 'none'

    expandedFolders[folderPath] = isNowExpanded
    globalThis.localStorage.setItem(
      'explorerFolders',
      JSON.stringify(expandedFolders),
    )

    const hasChildren = ul.children.length > 0
    if (hasChildren) {
      iconSpan.textContent = isNowExpanded
        ? FOLDER_OPEN_ICON
        : FOLDER_CLOSED_ICON
    }
  })
}

export function initResizablePanel(
  panelId: string,
  handleId: string,
  storageKey: string,
  direction: 'left' | 'right',
) {
  const panel = document.getElementById(panelId) as HTMLElement
  const handle = document.getElementById(handleId) as HTMLElement
  const collapsedKey = `${storageKey}Collapsed`
  const widthKey = `${storageKey}Width`

  const initialCollapsedClass = `${storageKey}-is-collapsed-initial`
  if (document.documentElement.classList.contains(initialCollapsedClass)) {
    panel.classList.add('panel-collapsed')
    document.documentElement.classList.remove(initialCollapsedClass)
  }

  const startResize = (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const initialWidth = panel.offsetWidth
    let isClick = true

    panel.classList.remove('panel-transitions')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const doResize = (moveE: MouseEvent) => {
      if (isClick && Math.abs(moveE.clientX - startX) > 5) isClick = false
      if (isClick) return

      panel.classList.remove('panel-collapsed')
      const deltaX = direction === 'left'
        ? moveE.clientX - startX
        : startX - moveE.clientX
      const newWidth = Math.max(0, Math.min(600, initialWidth + deltaX))
      panel.style.width = `${newWidth}px`
    }

    const stopResize = () => {
      document.removeEventListener('mousemove', doResize)
      document.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      panel.classList.add('panel-transitions')

      if (isClick) {
        togglePanel()
      } else {
        const finalWidth = panel.offsetWidth
        if (finalWidth > 60) {
          localStorage.setItem(widthKey, finalWidth.toString())
          localStorage.setItem(collapsedKey, 'false')
        } else {
          panel.classList.add('panel-collapsed')
          localStorage.setItem(collapsedKey, 'true')
        }
      }
    }

    document.addEventListener('mousemove', doResize)
    document.addEventListener('mouseup', stopResize)
  }

  const togglePanel = () => {
    const isCollapsed = panel.classList.contains('panel-collapsed')
    if (isCollapsed) {
      expandPanel()
    } else {
      collapsePanel()
    }
  }

  const expandPanel = () => {
    panel.classList.remove('panel-collapsed')
    const savedWidth = localStorage.getItem(widthKey) || '256'
    panel.style.width = `${savedWidth}px`
    localStorage.setItem(collapsedKey, 'false')
  }

  const collapsePanel = () => {
    localStorage.setItem(widthKey, panel.offsetWidth.toString())
    panel.classList.add('panel-collapsed')
    localStorage.setItem(collapsedKey, 'true')
  }

  handle.addEventListener('mousedown', startResize)
}

export const initExplorer = (): void => {
    const explorerList = document.getElementById('explorer-list') as HTMLUListElement
    updateExplorerState(decodeURIComponent(globalThis.location.pathname))
    setupExplorerEventDelegation(explorerList)
    initResizablePanel('explorer', 'explorer-handle', 'explorer', 'left')
}
