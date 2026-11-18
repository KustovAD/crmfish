import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApi } from './server/api.mjs';

/** Встроенная база: API /api/* работает прямо внутри `npm run dev` */
function localDb(): Plugin {
  const mount = (middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void }) =>
    middlewares.use((req, res, next) => {
      handleApi(req, res).then((handled) => !handled && next(), next);
    });
  return {
    name: 'crmfish-local-db',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig({
  plugins: [react(), localDb()],
  server: {
    host: true,
    port: 5173,
    watch: { ignored: ['**/data/**'] },
  },
  preview: { host: true, port: 5173 },
});
