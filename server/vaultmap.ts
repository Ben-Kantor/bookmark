import { basename, dirname, extname, fromFileUrl, join, resolve } from 'jsr:@std/path@1'
import { VaultMap, VaultMapDirectory } from './types.ts'
import * as CONFIG from './config.ts'

export const buildVaultMap_ = (
	dir: string = './',
	absolutePath?: string,
	isRoot: boolean = true,
): VaultMap => {
	const currentAbsolutePath = absolutePath || resolve(dirname(fromFileUrl(import.meta.url)), dir)
	const dirName = basename(currentAbsolutePath)

	const vaultNode: VaultMapDirectory = {
		name: dirName,
		dir: true,
		children: [],
		isRoot: isRoot,
	}

	if (isRoot) vaultNode.isRoot = true

	for (const entry of Deno.readDirSync(currentAbsolutePath)) {
		const entryAbsolutePath = join(currentAbsolutePath, entry.name)

		if (entry.isFile) {
			vaultNode.children.push({
				name: entry.name,
				dir: false,
			})
		} else if (entry.isDirectory) {
			vaultNode.children.push(
				buildVaultMap(entry.name, entryAbsolutePath, false),
			)
		}
	}

	return vaultNode
}

export const buildVaultMap = (
	dir: string = './',
	absolutePath?: string,
	isRoot: boolean = true,
): VaultMap => {
	return sortVaultMap(buildVaultMap_(dir, absolutePath, isRoot))
}

export const findFilePath = (
	vaultMap: VaultMap,
	fileName?: string,
	fileExtension?: string,
	currentPathSegment: string = '',
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
			extname(vaultMap.name),
		).toLowerCase()
		const actualExt = extname(vaultMap.name).replace('.', '').toLowerCase()

		const nameMatch = !fileName || nameWithoutExt === fileName.toLowerCase()
		const extMatch = !cleanExtension || actualExt === cleanExtension.toLowerCase()

		if (nameMatch && extMatch) return fullPathToThisNode

		return undefined
	}

	for (const child of vaultMap.children) {
		const pathFound = findFilePath(
			child,
			fileName,
			cleanExtension,
			fullPathToThisNode,
		)
		if (pathFound) return pathFound
	}

	return undefined
}

function sortVaultMap(node: VaultMap): VaultMap {
	if (!node.dir) return node

	return {
		...node,
		children: [...node.children].sort((a, b) => {
			if (!a.dir && b.dir) return 1
			if (
				a.name.charAt(0).toLowerCase() === a.name.charAt(0) &&
				b.name.charAt(0).toLowerCase() !== a.name.charAt(0)
			) {
				return 1
			}
			return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
		}),
	}
}

export const vaultMap = buildVaultMap(CONFIG.CONTENT_DIR) as VaultMapDirectory
