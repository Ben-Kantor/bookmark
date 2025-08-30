import {
	resolve,
	dirname,
	fromFileUrl,
	extname,
	basename,
	join,
} from 'https://deno.land/std/path/mod.ts'
import * as types from './types.ts'
import { toTitleCase } from './lib.ts'
import { contentDir } from './constants.ts'

export const buildVaultMap_ = (
	dir: string = './',
	absolutePath?: string,
	isRoot: boolean = true
): types.VaultMap => {
	const currentAbsolutePath =
		absolutePath || resolve(dirname(fromFileUrl(import.meta.url)), dir)
	const dirName = basename(currentAbsolutePath)

	const vaultNode: types.VaultMap = {
		name: dirName,
		dir: true,
		children: [],
	}

	if (isRoot) vaultNode.isRoot = true

	try {
		for (const entry of Deno.readDirSync(currentAbsolutePath)) {
			if (entry.name.startsWith('.')) continue

			const entryAbsolutePath = join(currentAbsolutePath, entry.name)

			if (entry.isFile) {
				vaultNode.children.push({
					name: entry.name,
					dir: false,
					title: toTitleCase(entry.name),
				})
			} else if (entry.isDirectory) {
				vaultNode.children.push(
					buildVaultMap(entry.name, entryAbsolutePath, false)
				)
			}
		}
	} catch (e) {
		console.error(`Error reading directory ${currentAbsolutePath}:`, e)
	}

	return vaultNode
}

export const buildVaultMap = (
	dir: string = './',
	absolutePath?: string,
	isRoot: boolean = true
): types.VaultMap => {
	return sortVaultMap(buildVaultMap_(dir, absolutePath, isRoot))
}

export const findFilePath = (
	vaultMap: types.VaultMap,
	fileName?: string,
	fileExtension?: string,
	currentPathSegment: string = ''
): string | undefined => {
	const cleanExtension = fileExtension?.replace('.', '')

	if (vaultMap.dir && vaultMap.isRoot) {
		for (const child of vaultMap.children) {
			const pathFound = findFilePath(child, fileName, cleanExtension, '')
			if (pathFound) return pathFound
		}
		return undefined
	}

	const fullPathToThisNode = currentPathSegment
		? join(currentPathSegment, vaultMap.name)
		: vaultMap.name

	if (!vaultMap.dir) {
		const nameWithoutExt = basename(
			vaultMap.name,
			extname(vaultMap.name)
		).toLowerCase()
		const actualExt = extname(vaultMap.name).replace('.', '').toLowerCase()

		const nameMatch = !fileName || nameWithoutExt === fileName.toLowerCase()
		const extMatch =
			!cleanExtension || actualExt === cleanExtension.toLowerCase()

		if (nameMatch && extMatch) return fullPathToThisNode

		return undefined
	}

	for (const child of vaultMap.children) {
		const pathFound = findFilePath(
			child,
			fileName,
			cleanExtension,
			fullPathToThisNode
		)
		if (pathFound) return pathFound
	}

	return undefined
}

function sortVaultMap(node: types.VaultMap): types.VaultMap {
  if (node.dir && node.children) {
    node.children.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    )
    node.children.forEach(sortVaultMap)
  }
  return node
}

export const vaultMap = buildVaultMap(contentDir)