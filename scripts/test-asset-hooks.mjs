// Unit tests only: let node import Vite asset modules (*.webp/*.svg/*.png) as their file name.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function load(url, context, next) {
  if (/\\.(webp|svg|png|jpe?g)$/.test(url)) {
    return { format: 'module', shortCircuit: true, source: 'export default ' + JSON.stringify(url.split('/').pop()) };
  }
  return next(url, context);
}`));
