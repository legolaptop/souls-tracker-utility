import '@testing-library/jest-dom/vitest'

// ---------------------------------------------------------------------------
// ImageData polyfill
// ---------------------------------------------------------------------------
// jsdom does not expose ImageData globally without the optional `canvas`
// package.  A lightweight polyfill is sufficient for unit-testing the
// pixel-manipulation utilities that only need data/width/height.
// ---------------------------------------------------------------------------
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray
    readonly width: number
    readonly height: number

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth
        this.height = widthOrHeight
        this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4)
      } else {
        this.data = dataOrWidth
        this.width = widthOrHeight
        this.height = height ?? dataOrWidth.length / (widthOrHeight * 4)
      }
    }
  }

  // @ts-expect-error – polyfill for test environment only
  globalThis.ImageData = ImageDataPolyfill
}
