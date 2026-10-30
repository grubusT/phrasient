// The app uses extensionless relative imports, which Metro and TypeScript both
// resolve but Node's ESM loader does not. This hook fills the extension in so
// tests can import application modules unchanged.
const EXTENSIONS = ['.ts', '.tsx', '.json'];

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const extension of EXTENSIONS) {
      try {
        return await next(specifier + extension, context);
      } catch {
        // try the next extension
      }
    }
  }
  return next(specifier, context);
}
