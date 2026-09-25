import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwincss from '@tailwindcss/vite'

const isHtml = (req: any) => Boolean(req.headers?.accept && req.headers.accept.includes('text/html'));

const apiProxy = (needsHtmlBypass = true) => ({
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  secure: false,
  ...(needsHtmlBypass ? { bypass: (req: any) => (isHtml(req) ? '/index.html' : undefined) } : {}),
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwincss(),
  ],
  define: {
    // Fix for sockjs-client "global is not defined" error
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': apiProxy(false),
      '/auth': apiProxy(false),
      '/dashboard': apiProxy(true),
      '/departments': apiProxy(true),
      '/org': apiProxy(true),
      '/emp': apiProxy(true),
      '/appraisals': apiProxy(true),
      '/appraisal-cycles': apiProxy(true),
      '/appraisal-forms': apiProxy(true),
      '/appraisal-form-sets': apiProxy(true),
      '/categories': apiProxy(true),
      '/job-levels': apiProxy(true),
      '/positions': apiProxy(true),
      '/roles': apiProxy(true),
      '/teams': apiProxy(true),
      '/financial-years': apiProxy(true),
      '/performance-categories': apiProxy(true),
      '/kpi': apiProxy(true),
      '/kpi-audit': apiProxy(false),
      '/pip': apiProxy(true),
      '/idp': apiProxy(true),
      '/feedback': apiProxy(true),
      '/self-assessments': apiProxy(false),
      '/manager-evaluations': apiProxy(false),
      '/public-diagnostics': apiProxy(false),
      '/reports': apiProxy(true),
    },
  },
})