import {
  ExplorerItem,
  FileTypeIcons,
  VaultMap,
} from './types.ts'

// Factory function to create an explorer builder with a given icon set.
export const createExplorerBuilder = (fileTypeIcons: FileTypeIcons) => {
  const createExplorerStructure = (
    items: VaultMap[],
    pathPrefix = '/',
  ): ExplorerItem[] => {
    return items
      .filter((item) => !item.name.startsWith('.'))
      .sort((a, b) => {
        if (a.dir !== b.dir) return a.dir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map((item) => {
        const currentPath = `${pathPrefix}${item.name}${item.dir ? '/' : ''}`

        return {
          type: item.dir ? 'directory' : 'file',
          name: item.name,
          path: currentPath,
          displayName: item.dir ? item.name : (item.title || item.name),
          extension: item.dir ? null : item.name.split('.').pop() || '',
          isActive: false, // Will be handled by the client
          isExpanded: false, // Will be handled by the client
          hasChildren: item.dir ? item.children.length > 0 : false,
          children: item.dir
            ? createExplorerStructure(item.children, currentPath)
            : [],
        }
      })
  }

  const generateExplorerHTML = (items: ExplorerItem[]): string => {
    return items.map((item) =>
      item.type === 'directory'
        ? generateDirectoryHTML(item)
        : generateFileHTML(item)
    ).join('')
  }

  const generateDirectoryHTML = (item: ExplorerItem): string => {
    const folderId = `folder-contents-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`
    const icon = item.hasChildren
      ? fileTypeIcons['folder-closed']
      : fileTypeIcons['folder-childless']

    const childrenHTML = `<ul id="${folderId}" role="group" style="display: none">${
      generateExplorerHTML(item.children)
    }</ul>`

    return `
      <li class="rounded p-0 folder" role="treeitem" aria-expanded="false">
        <button class="flex gap-2 w-full text-left" style="padding-left: 0" aria-expanded="false" ${item.hasChildren ? `aria-controls="${folderId}"` : ''} data-folder-path="${item.path}">
          <span class="pl-[0.5em] icon w-6 text-center">${icon || ''}</span>
          <span class="truncate">${item.name}</span>
        </button>
        ${childrenHTML}
      </li>
    `
  }

  const generateFileHTML = (item: ExplorerItem): string => {
    const iconChar = fileTypeIcons[item.extension?.toLowerCase() || ''] ?? fileTypeIcons.default

    return `
      <li class="rounded p-0" role="treeitem">
        <a href="${encodeURI(item.path)}" class="flex items-center w-full hover:text-[var(--text-accent)]${iconChar ? ' gap-2' : ''}" style="padding-left: 0">
          ${iconChar ? `<span class="pl-[0.5em] icon w-6 text-center">${iconChar}</span>` : '&nbsp;&nbsp;'}
          <span class="truncate">${item.displayName}</span>
        </a>
      </li>
    `
  }

  // The returned builder function.
  return (items: VaultMap[]): string => {
    const explorerStructure = createExplorerStructure(items)
    const explorerHtml = generateExplorerHTML(explorerStructure)
    return `<ul id="explorer-list" role="list" class="text-sm p-0">${explorerHtml}</ul>`
  }
}
