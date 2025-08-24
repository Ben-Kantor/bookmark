import {
	resolve,
	dirname,
	fromFileUrl,
	extname,
	basename,
	join,
} from 'https://deno.land/std@0.224.0/path/mod.ts'
import * as types from './types.ts'
import { toTitleCase } from './lib.ts'
import { contentDir } from './constants.ts'

const buildVaultMap = (
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

const watchVaultMap = (
	pathToIndex: string,
	onIndexUpdated: (newMap: types.VaultMap) => void
): (() => void) => {
	const absolutePathToIndex = resolve(
		dirname(fromFileUrl(import.meta.url)),
		pathToIndex
	)
	const watcher = Deno.watchFs(absolutePathToIndex)

	const update = (): void => onIndexUpdated(buildVaultMap(pathToIndex))
	update()

	const watchLoop = async (): Promise<void> => {
		for await (const { kind } of watcher) {
			if (['create', 'modify', 'remove'].includes(kind)) {
				setTimeout(update, 100)
			}
		}
	}

	watchLoop()
	return () => watcher.close()
}

const findFilePath = (
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

const loadFileContent = async (
	filePath: string
): Promise<{ content: string }> => ({
	content: await Deno.readTextFile(filePath).catch(() => 'File not found.'),
})

const fileExists = (filePath: string): boolean => {
	try {
		return Deno.statSync(filePath).isFile
	} catch {
		return false
	}
}

export let vaultMap = buildVaultMap(contentDir)

export {
	buildVaultMap,
	watchVaultMap,
	findFilePath,
	loadFileContent,
	fileExists,
}

watchVaultMap(contentDir, (newIndex: types.VaultMap) => (vaultMap = newIndex))
