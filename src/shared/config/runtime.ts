export const appBasePath = import.meta.env.BASE_URL

export function toBaseAssetPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${appBasePath}${normalizedPath}`
}
