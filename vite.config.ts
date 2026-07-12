import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

const APP_VERSION = Date.now().toString();

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'generate-version-json',
        buildStart() {
          const publicDir = path.resolve(import.meta.dirname || '.', 'public');
          if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
          fs.writeFileSync(
            path.resolve(publicDir, 'version.json'),
            JSON.stringify({ version: APP_VERSION })
          );
        }
      }
    ],
    build: {
      sourcemap: false,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
      '__APP_VERSION__': JSON.stringify(APP_VERSION)
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        'react-is': path.resolve(import.meta.dirname, 'node_modules/react-is'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
