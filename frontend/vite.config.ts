import { createRequire } from 'node:module'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import {
  isCodeObfuscationEnabled,
  javascriptObfuscatorOptions,
  terserMinifyOptions,
} from './config/obfuscator'
import { viteObfuscatorPlugin } from './config/viteObfuscatorPlugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const codeObfuscation = isCodeObfuscationEnabled(mode, env)
  const securityAes =
    env.VITE_SECURITY_AES ||
    process.env.VITE_SECURITY_AES ||
    (mode === 'production' ? 'true' : 'false')
  const routeObfuscation =
    env.VITE_ROUTE_OBFUSCATION ||
    process.env.VITE_ROUTE_OBFUSCATION ||
    (mode === 'production' ? 'true' : 'false')
  const fieldEncryption =
    env.VITE_FIELD_ENCRYPTION ||
    process.env.VITE_FIELD_ENCRYPTION ||
    (mode === 'production' ? 'true' : 'false')
  const directPython =
    env.VITE_DIRECT_PYTHON === 'true' || env.VITE_DIRECT_PYTHON === '1'
  const remoteGateway = env.VITE_REMOTE_GATEWAY?.replace(/\/$/, '')
  /** 认证直连地址（推荐 :8081），避免网关 lb 无实例时 503 */
  const remoteAuth = env.VITE_REMOTE_AUTH?.replace(/\/$/, '')
  const authProxyTarget = remoteAuth || remoteGateway
  const localPyai = env.VITE_LOCAL_PYAI || 'http://127.0.0.1:8082'
  const localContent = env.VITE_LOCAL_CONTENT || 'http://127.0.0.1:8091'
  const localBilling = env.VITE_LOCAL_BILLING || 'http://127.0.0.1:8092'
  const apiProxyTarget = directPython ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:8080'
  const useRemoteDev = Boolean(authProxyTarget || env.VITE_LOCAL_PYAI)

  const apiProxy = useRemoteDev
    ? {
        '/api/auth': {
          target: authProxyTarget!,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
        },
        '/api/agent': {
          target: localPyai,
          changeOrigin: true,
          ws: true,
          timeout: 0,
          proxyTimeout: 0,
        },
        '/api/content': {
          target: localContent,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
        },
        '/api/billing': {
          target: localBilling,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
        },
      }
    : {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
        },
      }

  const plugins: PluginOption[] = [react(), tailwindcss()]
  if (process.env.ANALYZE === 'true') {
    try {
      const require = createRequire(import.meta.url)
      const { visualizer } = require('rollup-plugin-visualizer') as typeof import('rollup-plugin-visualizer')
      plugins.push(
        visualizer({
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          open: false,
        }),
      )
    } catch {
      console.warn('[analyze] rollup-plugin-visualizer not installed; run pnpm install')
    }
  }
  if (codeObfuscation) {
    plugins.push(viteObfuscatorPlugin(javascriptObfuscatorOptions()))
  }

  return {
    plugins,
    build: {
      sourcemap: !codeObfuscation,
      minify: codeObfuscation ? 'terser' : 'esbuild',
      terserOptions: codeObfuscation ? terserMinifyOptions() : undefined,
      chunkSizeWarningLimit: codeObfuscation ? 1200 : 500,
      rollupOptions: {
        output: {
          chunkFileNames(chunkInfo) {
            if (chunkInfo.facadeModuleId?.includes('RouteFallbackShell')) {
              return 'assets/route-shells-[hash].js'
            }
            return 'assets/[name]-[hash].js'
          },
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('recharts') || id.includes('d3-')) return 'recharts'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('/gsap')) return 'gsap'
            if (id.includes('react-markdown') || id.includes('remark-')) return 'markdown'
            if (id.includes('styled-components')) return 'styled'
            if (id.includes('@radix-ui') || id.includes('radix-ui')) return 'radix'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('i18next')) return 'i18n'
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_SECURITY_AES': JSON.stringify(securityAes),
      'import.meta.env.VITE_ROUTE_OBFUSCATION': JSON.stringify(routeObfuscation),
      'import.meta.env.VITE_FIELD_ENCRYPTION': JSON.stringify(fieldEncryption),
    },
    test: {
      globals: false,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 3000,
      proxy: apiProxy,
    },
  }
})
