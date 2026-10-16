// The one module the plugin's own code imports from this folder. It is JavaScript, with `entry.d.ts` beside it,
// so that the project's `tsconfig.json` sees only that declaration: the snippets are upstream's code and are
// type-checked by `tsconfig.json` in this folder instead, under the official sample plugin's compiler options.
export { registerDocsShowcase } from './index.ts';
