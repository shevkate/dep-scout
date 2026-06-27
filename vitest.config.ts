import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // Let Vite transform Vuetify so its `.css` side-imports are handled
      // instead of being externalised to Node (which can't load .css).
      server: { deps: { inline: ['vuetify'] } },
    },
  }),
)
