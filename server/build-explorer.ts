import { ExplorerItem, FileTypeIcons, VaultMap } from './types.ts'

// Factory function to create an explorer builder with a given icon set.
export const createExplorerBuilder = (
	fileTypeIcons: FileTypeIcons,
): (items: VaultMap[]) => string => {
	const createExplorerStructure = (
		items: VaultMap[],
		pathPrefix = '/',
	): ExplorerItem[] => {
		const filtered = items.filter((item) => !item.name.startsWith('.'))

		const explorerEntries: ExplorerItem[] = []

		for (const entry of filtered) {
			//if (entry.name.startsWith('.')) continue
			explorerEntries.push({
				type: entry.dir ? 'directory' : 'file',
				name: entry.name,
				path: `${pathPrefix}${entry.name}${entry.dir ? '/' : ''}`,
				displayName: entry.name,
				extension: entry.dir ? null : entry.name.split('.').pop() || '',
				children: entry.dir
					? createExplorerStructure(entry.children, `${pathPrefix}${entry.name}/`)
					: [],
			})
		}

		return explorerEntries
	}

	const generateExplorerHTML = (items: ExplorerItem[]): string => {
		return items.map((item) =>
			item.type === 'directory' ? generateDirectoryHTML(item) : generateFileHTML(item)
		).join('')
	}

	const generateDirectoryHTML = (item: ExplorerItem): string => {
		const folderId = `folder-contents-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`
		const icon = item.children.length > 0
			? fileTypeIcons['folder-closed']
			: fileTypeIcons['folder-childless']

		const childrenHTML = `<ul id="${folderId}" role="group" style="display: none">${
			generateExplorerHTML(item.children)
		}</ul>`

		return `
      <li class="explorer-item folder" role="treeitem" aria-expanded="false">
        <button class="explorer-folder-button" style="padding-left: 0" aria-expanded="false" ${
			item.children.length > 0 ? `aria-controls="${folderId}"` : ''
		} data-folder-path="${item.path}" aria-label="${item.name} folder">
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
        <a href="${encodeURI(item.path)}" class="explorer-file-link${
			iconChar ? ' has-icon' : ''
		}" style="padding-left: 0" aria-label="${item.displayName}">
          ${
			iconChar
				? `<span class="item-icon icon" aria-hidden="true">${iconChar}</span>`
				: '<span aria-hidden="true">&nbsp;&nbsp;</span>'
		}
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
