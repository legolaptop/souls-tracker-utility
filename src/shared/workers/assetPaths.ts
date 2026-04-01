import { toBaseAssetPath } from '@/shared/config/runtime'

/**
 * Builds a GitHub-Pages-safe absolute URL for worker-side assets.
 * Supports both app-relative paths and fully-qualified external URLs.
 */
export function toWorkerAssetUrl(assetPath: string, origin: string): string {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath
  }
  const baseRelativePath = toBaseAssetPath(assetPath)
  return new URL(baseRelativePath, origin).toString()
}
