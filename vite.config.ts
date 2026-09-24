import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import vercel from './vercel.json'

// vite preview에도 배포(vercel.json)와 같은 보안 헤더 적용 — CSP가 화면을 깨지 않는지 배포 전에 확인
const securityHeaders = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { headers: securityHeaders },
})
