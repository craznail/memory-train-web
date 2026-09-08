/** Prefix public asset paths with Vite base (GitHub Pages subpath). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`;
}
