import { FileTypeIcons, TocItem } from '../../server/types.ts'

import { mainContentEl, expandedTocItems } from './constants-client.ts'

declare const fileTypeIcons: FileTypeIcons;

export const generateToc = (): void => {
  const headings: HTMLHeadingElement[] = Array.from(
    mainContentEl.querySelectorAll<HTMLHeadingElement>(
      ":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6",
    ),
  );

  const tocPanel: HTMLElement | null = document.getElementById("toc-panel");
  const tocHandle: HTMLElement | null = document.getElementById("toc-handle");
  const tocList: HTMLElement | null = document.getElementById("toc-list");
  const mobileButton: HTMLElement | null = document.getElementById(
    "mobile-toc-button",
  );

  if (!tocPanel || !tocHandle || !tocList) return;

  if (headings.length < 2) {
    tocPanel.classList.add("is-empty");
    tocHandle.classList.add("is-empty");
    mobileButton?.classList.add("is-empty");
    return;
  }

  tocPanel.classList.remove("is-empty");
  tocHandle.classList.remove("is-empty");
  mobileButton?.classList.remove("is-empty");
  tocList.innerHTML = "";

  const tocItems: TocItem[] = headings.map((h, i) => {
    const level: number = parseInt(h.tagName[1]);
    if (!h.id) h.id = encodeURIComponent(h.textContent || `header-${i}`);

    return {
      id: h.id,
      text: h.textContent || "",
      level,
      children: [],
    };
  });

  const hierarchy: TocItem[] = buildTocHierarchy(tocItems);
  renderTocItems(hierarchy, tocList as HTMLUListElement, 0);
};

const buildTocHierarchy = (items: TocItem[]): TocItem[] => {
  const root: TocItem = { id: "", text: "", level: 0, children: [] };
  const stack: TocItem[] = [root];

  for (const item of items) {
    while (stack.length > 1 && item.level <= stack[stack.length - 1].level) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(item);
    stack.push(item);
  }

  return root.children;
};

function renderTocItems(
  items: TocItem[],
  parentEl: HTMLUListElement,
  level: number,
): void {
  for (const item of items) {
    const li: HTMLLIElement = document.createElement("li");
    li.className = "rounded p-0";
    li.setAttribute("role", "treeitem");

    item.children.length > 0
      ? renderTocDir(item, li, parentEl, level)
      : renderTocLeaf(item, li, parentEl);
  }
}

function renderTocDir(
  item: TocItem,
  li: HTMLLIElement,
  parentEl: HTMLUListElement,
  level: number,
): void {
  const isExpanded: boolean = expandedTocItems[item.id] !== false;
  const folderId: string = `toc-contents-${
    item.id.replace(
      /[^a-zA-Z0-9]/g,
      "-",
    )
  }`;

  li.classList.add("folder");
  if (isExpanded) li.classList.add("expanded");
  li.setAttribute("aria-expanded", String(isExpanded));

  const icon: string = isExpanded
    ? fileTypeIcons["heading-open"]
    : fileTypeIcons["heading-closed"];

  const button: HTMLButtonElement = document.createElement("button");
  button.className = "flex gap-2 w-full text-left";
  button.style.paddingLeft = "0";
  button.innerHTML =
    `<span class="pl-[0.5em] icon w-6 text-center">${icon || ""}</span>` +
    `<span class="truncate">${item.text}</span>`;

  button.setAttribute("aria-expanded", String(isExpanded));
  button.setAttribute("aria-controls", folderId);

  button.onclick = (e: MouseEvent) => {
    e.preventDefault();

    const isNowExpanded: boolean = li.classList.toggle("expanded");
    li.setAttribute("aria-expanded", String(isNowExpanded));
    button.setAttribute("aria-expanded", String(isNowExpanded));

    const ul = li.querySelector("ul") as HTMLUListElement | null;
    if (ul) ul.style.display = isNowExpanded ? "block" : "none";

    expandedTocItems[item.id] = isNowExpanded;
    globalThis.localStorage.setItem(
      "tocItems",
      JSON.stringify(expandedTocItems),
    );

    const iconSpan = button.querySelector(".icon") as HTMLSpanElement | null;
    if (iconSpan) {
      iconSpan.textContent = isNowExpanded
        ? fileTypeIcons["heading-open"] || ""
        : fileTypeIcons["heading-closed"] || "";
    }
  };

  li.appendChild(button);

  const ul: HTMLUListElement = document.createElement("ul");
  ul.id = folderId;
  ul.setAttribute("role", "group");
  if (!isExpanded) ul.style.display = "none";

  renderTocItems(item.children, ul, level + 1);
  li.appendChild(ul);

  parentEl.appendChild(li);
}

function renderTocLeaf(
  item: TocItem,
  li: HTMLLIElement,
  parentEl: HTMLUListElement,
): void {
  const iconChar: string = fileTypeIcons["heading-childless"];

  const anchor: HTMLAnchorElement = document.createElement("a");
  anchor.href = `#${item.id}`;
  anchor.className =
    `flex items-center w-full hover:text-[var(--text-accent)]` +
    `${iconChar ? " gap-2" : ""}`;

  anchor.style.paddingLeft = "0";
  anchor.innerHTML =
    (iconChar
      ? `<span class="pl-[0.5em] icon w-6 text-center">${iconChar}</span>`
      : "&nbsp;&nbsp;") + `<span class="truncate">${item.text}</span>`;

  li.appendChild(anchor);
  parentEl.appendChild(li);
}
