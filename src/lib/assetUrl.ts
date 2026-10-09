/** Prefix public asset paths with Vite base (GitHub Pages subpath). */
export function assetUrl(path: string): string {
  const base = import.meta.env?.BASE_URL || '/'; // ?. lets node unit tests import data modules;
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`;
}
