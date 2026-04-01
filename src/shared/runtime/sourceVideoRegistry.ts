interface RegisteredSourceVideoAsset {
  sourceVideoId: string
  objectUrl: string
  fileName: string
}

const sourceVideoAssets = new Map<string, RegisteredSourceVideoAsset>()

export function registerSourceVideoFile(sourceVideoId: string, file: File): RegisteredSourceVideoAsset {
  const existing = sourceVideoAssets.get(sourceVideoId)
  if (existing) {
    URL.revokeObjectURL(existing.objectUrl)
  }

  const objectUrl = URL.createObjectURL(file)
  const asset: RegisteredSourceVideoAsset = {
    sourceVideoId,
    objectUrl,
    fileName: file.name,
  }

  sourceVideoAssets.set(sourceVideoId, asset)
  return asset
}

export function getRegisteredSourceVideoAsset(sourceVideoId: string): RegisteredSourceVideoAsset | null {
  return sourceVideoAssets.get(sourceVideoId) ?? null
}

export function unregisterSourceVideoAsset(sourceVideoId: string): void {
  const asset = sourceVideoAssets.get(sourceVideoId)
  if (!asset) {
    return
  }

  URL.revokeObjectURL(asset.objectUrl)
  sourceVideoAssets.delete(sourceVideoId)
}

export function clearRegisteredSourceVideoAssets(): void {
  for (const asset of sourceVideoAssets.values()) {
    URL.revokeObjectURL(asset.objectUrl)
  }
  sourceVideoAssets.clear()
}