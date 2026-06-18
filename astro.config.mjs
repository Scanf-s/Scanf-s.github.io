import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://scanf-s.github.io',
  integrations: [sitemap()],
});
