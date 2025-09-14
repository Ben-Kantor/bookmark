import {
  ExplorerItem,
  FileTypeIcons,
  VaultMap,
} from './types.ts'

// Factory function to create an explorer builder with a given icon set.
export const createExplorerBuilder = (fileTypeIcons: FileTypeIcons): (items: VaultMap[]) => string => {
  const createExplorerStructure = (
    items: VaultMap[],
    pathPrefix = '/',
  ): ExplorerItem[] => {
    const filtered = items.filter((item) => !item.name.startsWith('.'))

    // Separate directories and files
    const dirs = filtered.filter(item => item.dir)
    const files = filtered.filter(item => !item.dir)

    // Sort each group: capital letters first, then natural numeric sort
    const sortGroup = (group: VaultMap[]): VaultMap[] => {
      const capital = group.filter(item => item.name.charAt(0).toUpperCase() === item.name.charAt(0) && item.name.charAt(0).toLowerCase() !== item.name.charAt(0))
      const lowercase = group.filter(item => !(item.name.charAt(0).toUpperCase() === item.name.charAt(0) && item.name.charAt(0).toLowerCase() !== item.name.charAt(0)))

      capital.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      lowercase.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

      return [...capital, ...lowercase]
    }

    return [...sortGroup(dirs), ...sortGroup(files)]
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
      <li class="explorer-item folder" role="treeitem" aria-expanded="false">
        <button class="explorer-folder-button" style="padding-left: 0" aria-expanded="false" ${item.hasChildren ? `aria-controls="${folderId}"` : ''} data-folder-path="${item.path}" aria-label="${item.name} folder">
          <span class="item-icon icon" aria-hidden="true">${icon || ''}</span>
          <span class="item-text">${item.name}</span>
        </button>
        ${childrenHTML}
      </li>
    `
  }

  const generateFileHTML = (item: ExplorerItem): string => {
    const iconChar = fileTypeIcons[item.extension?.toLowerCase() || ''] ?? fileTypeIcons.default

    return `
      <li class="explorer-item" role="treeitem">
        <a href="${encodeURI(item.path)}" class="explorer-file-link${iconChar ? ' has-icon' : ''}" style="padding-left: 0" aria-label="${item.displayName}">
          ${iconChar ? `<span class="item-icon icon" aria-hidden="true">${iconChar}</span>` : '<span aria-hidden="true">&nbsp;&nbsp;</span>'}
          <span class="item-text">${item.displayName}</span>
        </a>
      </li>
    `
  }

  // The returned builder function.
  return (items: VaultMap[]): string => {
    const explorerStructure = createExplorerStructure(items)
    const explorerHtml = generateExplorerHTML(explorerStructure)
    return `<ul id="explorer-list" role="list">${explorerHtml}</ul>`
  }
}
