const getImageDimensions = (
    src: string,
    timeout = 5000,
): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const img = new Image()
        const timeoutId = setTimeout(() => {
            reject(new Error(`Image load timeout: ${src}`))
        }, timeout)

        img.onload = () => {
            clearTimeout(timeoutId)
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = () => {
            clearTimeout(timeoutId)
            reject(new Error(`Failed to load image: ${src}`))
        }
        img.src = src
    })

export const wrapImages = async (): Promise<void> => {
    const imagesToWrap = Array.from(document.querySelectorAll<HTMLImageElement>(
        'main.content img.lightbox-image:not(a[data-pswp-width] > img)',
    ))

    const processImage = async (img: HTMLImageElement) => {
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
    }

    // Process images in batches to avoid overwhelming the browser
    for (let i = 0; i < imagesToWrap.length; i += 5) {
        const batch = imagesToWrap.slice(i, i + 5)
        await Promise.all(batch.map(processImage))
    }
}
