import config from './vite.config.mjs';

// The Electron Forge Vite plugin points at this file for the renderer build.
// The real configuration lives in the root `vite.config.mjs` so that both the
// build and external tooling (e.g. the shadcn CLI) use the same config.
export default config;
