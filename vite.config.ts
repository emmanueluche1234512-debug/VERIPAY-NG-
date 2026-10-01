import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { handleApiRequest } from './src/server/apiRouter';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'veripay-api-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const handled = await handleApiRequest(req, res);
            if (!handled) {
              next();
            }
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const handled = await handleApiRequest(req, res);
            if (!handled) {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      ...(supabaseUrl ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl) } : {}),
      ...(supabaseAnonKey
        ? { 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey) }
        : {})
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true'
    }
  };
});
