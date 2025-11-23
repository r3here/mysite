import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Google GenAI SDK and your usage
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // If you have other env vars, add them here or use 'process.env': env
    }
  };
});