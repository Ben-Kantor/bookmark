const getImageDimensions = (
	src: string
): Promise<{ width: number; height: number }> =>
	new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () =>
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
		img.onerror = () => reject(new Error(`Failed to load image at: ${src}`))
		img.src = src
	})

export const wrapImages = async (): Promise<void> => {
	const imagesToWrap = document.querySelectorAll<HTMLImageElement>(
		'main.content img.lightbox-image:not(a[data-pswp-width] > img)'
	)

	const processingPromises = Array.from(imagesToWrap).map(async img => {
		if (!img.src) return

		try {
			const { width, height } = await getImageDimensions(img.src)
			const relativePath = new URL(img.src).pathname.replace(/^\/!\//, '')
			const basename = relativePath.split('/').pop() || 'image'

			const link = document.createElement('a')
			link.href = img.src
			link.target = '_blank'
			link.dataset.pswpWidth = String(width)
			link.dataset.pswpHeight = String(height)

			img.dataset.pswpSrc = link.href
			img.alt = `Image preview for ${basename}`

			img.replaceWith(link)
			link.appendChild(img)
		} catch (error) {
			console.error(`Could not process image: ${img.src}`, error)
		}
	})

	await Promise.all(processingPromises)
}
