import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [
        react(),
    ],

    build: {
        target: 'es2022',
        outDir: 'build',
        emptyOutDir: true,
        assetsInlineLimit: 0, // prevent inlining fonts (breaks content security policy)
        rollupOptions: {
            input: {
                main: `./index.html`,
            },
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]',
            },
        }
    },

    css: {
        devSourcemap: true,
        preprocessorOptions: {
            scss: {
                // https://github.com/twbs/bootstrap/issues/40962 – should be able to remove when Bootstrap 6 is available
                silenceDeprecations: ['color-functions', 'global-builtin', 'if-function', 'import'],
            },
        },
    },

    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
});
