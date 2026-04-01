import { describe, it, expect } from 'vitest'
import type { OcrProvider } from '@/worker/ocr/ocrProvider'
import { StubOcrProvider } from '@/worker/ocr/stubOcrProvider'

describe('StubOcrProvider', () => {
  it('initialize() resolves without error', async () => {
    const provider: OcrProvider = new StubOcrProvider()
    await expect(provider.initialize()).resolves.toBeUndefined()
  })

  it('recognizeRegion() returns empty lines and zero elapsedMs', async () => {
    const provider: OcrProvider = new StubOcrProvider()
    await provider.initialize()

    const imageData = new ImageData(10, 10)
    const result = await provider.recognizeRegion(imageData)

    expect(result.lines).toEqual([])
    expect(result.elapsedMs).toBe(0)
  })

  it('terminate() resolves without error', async () => {
    const provider: OcrProvider = new StubOcrProvider()
    await provider.initialize()
    await expect(provider.terminate()).resolves.toBeUndefined()
  })

  it('can be called multiple times without error', async () => {
    const provider: OcrProvider = new StubOcrProvider()
    await provider.initialize()

    const imageData = new ImageData(5, 5)
    const r1 = await provider.recognizeRegion(imageData)
    const r2 = await provider.recognizeRegion(imageData)

    expect(r1).toEqual(r2)
  })

  it('recognizeRegion() result has the expected shape', async () => {
    const provider: OcrProvider = new StubOcrProvider()
    await provider.initialize()

    const result = await provider.recognizeRegion(new ImageData(1, 1))

    expect(result).toHaveProperty('lines')
    expect(result).toHaveProperty('elapsedMs')
    expect(Array.isArray(result.lines)).toBe(true)
    expect(typeof result.elapsedMs).toBe('number')
  })
})
