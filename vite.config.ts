import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { markdown } from './plugins/markdown';

// `npm run build`        → dist/        (GitHub Pages; works from any sub-path thanks to base: './')
// `npm run build:single` → dist-single/ (one self-contained index.html, handy for previews & sharing)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [markdown(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 1500,
      target: 'es2020',
    },
    server: { host: true },
  };
});
