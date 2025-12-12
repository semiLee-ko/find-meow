import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'find-meow',
  brand: {
    displayName: '냥티비', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#3d8bffff', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: 'https://static.toss.im/appsintoss/10277/39de51d9-a6b3-4962-b8df-101a60153bad.png', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
    bridgeColorMode: 'basic',
  },
  web: {
    host: '0.0.0.0',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
