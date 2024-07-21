import path from 'node:path';
import { appTools, defineConfig } from '@modern-js/app-tools';
import { ssgPlugin } from '@modern-js/plugin-ssg';
import { bffPlugin } from '@modern-js/plugin-bff';
import { expressPlugin } from '@modern-js/plugin-express';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  source: {
    include: [path.resolve(__dirname, './shared/async-pool/**/*.js')],
  },
  tools: {
    babel(config) {
      config.sourceType = 'unambiguous';
    },
  },
  server: {
    port: 3000,
  },
  dev: {
    port: 3000,
  },
  runtime: {
    router: true,
  },
  output: {
    ssg: true,
  },
  plugins: [
    appTools({
      bundler: 'experimental-rspack',
    }),
    ssgPlugin(),
    bffPlugin(),
    expressPlugin(),
  ],
});
