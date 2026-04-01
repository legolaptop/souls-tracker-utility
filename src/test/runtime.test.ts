import { describe, it, expect } from 'vitest'

import { appBasePath, toBaseAssetPath } from '@/shared/config/runtime'

describe('appBasePath', () => {
  it('is a non-empty string', () => {
    expect(typeof appBasePath).toBe('string')
    expect(appBasePath.length).toBeGreaterThan(0)
  })

  it('ends with a trailing slash', () => {
    // Vite always appends a trailing slash to BASE_URL
    expect(appBasePath.endsWith('/')).toBe(true)
  })
})

describe('toBaseAssetPath', () => {
  it('prepends the base path to a relative path', () => {
    const result = toBaseAssetPath('worker.js')
    expect(result).toBe(`${appBasePath}worker.js`)
  })

  it('strips the leading slash before prepending the base path', () => {
    const result = toBaseAssetPath('/worker.js')
    expect(result).toBe(`${appBasePath}worker.js`)
  })

  it('does not produce a double slash', () => {
    const result = toBaseAssetPath('/assets/model.wasm')
    expect(result).not.toContain('//')
  })

  it('handles nested paths without a leading slash', () => {
    const result = toBaseAssetPath('assets/ocr/tesseract.js')
    expect(result).toBe(`${appBasePath}assets/ocr/tesseract.js`)
  })

  it('returns a URL that starts with the base path', () => {
    const result = toBaseAssetPath('cdn-asset.js')
    expect(result.startsWith(appBasePath)).toBe(true)
  })
})
