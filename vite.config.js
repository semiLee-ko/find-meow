import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173,
    },
    base: './', // GitHub Pages 배포를 위한 상대 경로 설정
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});
