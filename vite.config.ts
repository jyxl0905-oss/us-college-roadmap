import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import vercel from './vercel.json'

// vite preview에도 배포(vercel.json)와 같은 보안 헤더 적용 — CSP가 화면을 깨지 않는지 배포 전에 확인
const securityHeaders = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { headers: securityHeaders },
  build: {
    rollupOptions: {
      output: {
        // 거의 안 바뀌는 라이브러리는 별도 파일로 — 배포마다 재방문자가 다시 받지 않도록 (브라우저 캐시 유지)
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Supabase 클라이언트(인증·DB) 단일 파일이 ~400KB라 기본 경고 기준(500KB)을 넘음 — 첫 화면 로딩 약 1.5초로 확인됨
    chunkSizeWarningLimit: 700,
  },
})
