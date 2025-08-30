import {
ExplorerItem,
	FileTypeIcons,
	VaultMap,
} from '../../server/types.ts'

import { expandedFolders } from './constants-client.ts'

declare const fileTypeIcons: FileTypeIcons

const createExplorerStructure = (
  items: VaultMap[], 
  pathPrefix = '/', 
  activePath: string
): ExplorerItem[] => {
  const visibleItems = items.filter(item => !item.name.startsWith('.'));
  
  return visibleItems
    .sort((a, b) => {
      if (a.dir !== b.dir) return a.dir ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map(item => ({
      type: item.dir ? 'directory' : 'file',
      name: item.name,
      path: `${pathPrefix}${item.name}${item.dir ? '/' : ''}`,
      displayName: item.dir ? item.name : (item.title || item.name),
      extension: item.dir ? null : item.name.split('.').pop() || '',
      isActive: !item.dir && decodeURIComponent(`${pathPrefix}${item.name}`) === activePath,
      isExpanded: item.dir ? (
        activePath.startsWith(`${pathPrefix}${item.name}/`) ||
        expandedFolders[`${pathPrefix}${item.name}/`] ||
        false
      ) : false,
      hasChildren: item.dir ? item.children.length > 0 : false,
      children: item.dir ? createExplorerStructure(item.children, `${pathPrefix}${item.name}/`, activePath) : []
    }));
};

const generateExplorerHTML = (items: ExplorerItem[]): string => {
  return items.map(item => {
    if (item.type === 'directory') {
      return generateDirectoryHTML(item);
    } else {
      return generateFileHTML(item);
    }
  }).join('');
};

const generateDirectoryHTML = (item: ExplorerItem): string => {
  const folderId = `folder-contents-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const icon = item.hasChildren
    ? item.isExpanded ? fileTypeIcons['folder-open'] : fileTypeIcons['folder-closed']
    : fileTypeIcons['folder-childless'];
  
  const childrenHTML = item.isExpanded && item.children.length > 0
    ? `<ul id="${folderId}" role="group">${generateExplorerHTML(item.children)}</ul>`
    : `<ul id="${folderId}" role="group" style="display: none">${generateExplorerHTML(item.children)}</ul>`;

  return `
    <li class="rounded p-0 folder ${item.isExpanded ? 'expanded' : ''}" 
        role="treeitem" 
        aria-expanded="${item.isExpanded}">
      <button class="flex gap-2 w-full text-left" 
              style="padding-left: 0"
              aria-expanded="${item.isExpanded}"
              ${item.hasChildren ? `aria-controls="${folderId}"` : ''}
              data-folder-path="${item.path}">
        <span class="pl-[0.5em] icon w-6 text-center">${icon || ''}</span>
        <span class="truncate">${item.name}</span>
      </button>
      ${childrenHTML}
    </li>
  `;
};

const generateFileHTML = (item: ExplorerItem): string => {
  const iconChar = fileTypeIcons[item.extension?.toLowerCase() || ''] ?? fileTypeIcons.default;
  const activeClasses = item.isActive ? ' active-file font-bold' : '';
  const ariaCurrent = item.isActive ? 'aria-current="page"' : '';
  const liClasses = item.isActive ? 'rounded p-0 active-file-row' : 'rounded p-0';
  
  return `
    <li class="${liClasses}" role="treeitem">
      <a href="${encodeURI(item.path)}" 
         class="flex items-center w-full hover:text-[var(--text-accent)]${iconChar ? ' gap-2' : ''}${activeClasses}"
         style="padding-left: 0"
         ${ariaCurrent}>
        ${iconChar 
          ? `<span class="pl-[0.5em] icon w-6 text-center">${iconChar}</span>`
          : '&nbsp;&nbsp;'
        }
        <span class="truncate">${item.displayName}</span>
      </a>
    </li>
  `;
};

const setupExplorerEventDelegation = (parentEl: HTMLUListElement): void => {
  parentEl.addEventListener('click', (e: MouseEvent) => {
    const button = (e.target as Element).closest('button[data-folder-path]') as HTMLButtonElement;
    if (!button) return;
    
    e.preventDefault();
    
    const folderPath = button.dataset.folderPath!;
    const li = button.closest('li')!;
    const ul = li.querySelector('ul')!;
    const iconSpan = button.querySelector('.icon')!;
    
    const isNowExpanded = li.classList.toggle('expanded');
    li.setAttribute('aria-expanded', String(isNowExpanded));
    button.setAttribute('aria-expanded', String(isNowExpanded));
    ul.style.display = isNowExpanded ? 'block' : 'none';
    
    expandedFolders[folderPath] = isNowExpanded;
    globalThis.localStorage.setItem('explorerFolders', JSON.stringify(expandedFolders));
    
    const hasChildren = ul.children.length > 0;
    if (hasChildren) {
      iconSpan.textContent = isNowExpanded
        ? fileTypeIcons['folder-open'] || ''
        : fileTypeIcons['folder-closed'] || '';
    }
  });
};

export const renderExplorer = (
  items: VaultMap[],
  parentEl: HTMLUListElement,
  pathPrefix = '/',
  activePath: string
): void => {
  const explorerStructure = createExplorerStructure(items, pathPrefix, activePath);
  const htmlString = generateExplorerHTML(explorerStructure);
  
  parentEl.innerHTML = htmlString;
  
  if (!parentEl.dataset.delegationSetup) {
    setupExplorerEventDelegation(parentEl);
    parentEl.dataset.delegationSetup = 'true';
  }
};



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
