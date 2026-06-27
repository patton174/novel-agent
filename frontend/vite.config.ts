import { createRequire } from 'node:module'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import {
  isCodeObfuscationEnabled,
  javascriptObfuscatorHeavyOptions,
  javascriptObfuscatorLightOptions,
  SECURITY_CHUNK_NAME,
  terserMinifyOptions,
} from './config/obfuscator'
import { viteObfuscatorPlugin } from './config/viteObfuscatorPlugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const monolith =
    env.VITE_MONOLITH === 'true' ||
    env.VITE_MONOLITH === '1' ||
    process.env.VITE_MONOLITH === 'true'
  const codeObfuscation = isCodeObfuscationEnabled(mode, env)
  const securityDefault = mode === 'production' ? 'true' : 'false'
  const securityAes =
    env.VITE_SECURITY_AES ||
    process.env.VITE_SECURITY_AES ||
    securityDefault
  const routeObfuscation =
    env.VITE_ROUTE_OBFUSCATION ||
    process.env.VITE_ROUTE_OBFUSCATION ||
    securityDefault
  const fieldEncryption =
    env.VITE_FIELD_ENCRYPTION ||
    process.env.VITE_FIELD_ENCRYPTION ||
    securityDefault
  const securityEncryptStream =
    env.VITE_SECURITY_ENCRYPT_STREAM ||
    process.env.VITE_SECURITY_ENCRYPT_STREAM ||
    securityDefault
  const directPython =
    env.VITE_DIRECT_PYTHON === 'true' || env.VITE_DIRECT_PYTHON === '1'
  const remoteGateway = env.VITE_REMOTE_GATEWAY?.replace(/\/$/, '')
  /** 认证直连地址（推荐 :8081），避免网关 lb 无实例时 503 */
  const remoteAuth = env.VITE_REMOTE_AUTH?.replace(/\/$/, '')
  const authProxyTarget = remoteAuth || remoteGateway
  const localPyai = env.VITE_LOCAL_PYAI || 'http://127.0.0.1:8082'
  const localContent = env.VITE_LOCAL_CONTENT || 'http://127.0.0.1:8091'
  const localBilling = env.VITE_LOCAL_BILLING || 'http://127.0.0.1:8092'
  const localMonolith = env.VITE_LOCAL_MONOLITH || 'http://127.0.0.1:8080'
  const apiProxyTarget = directPython ? 'http://127.0.0.1:8000' : localMonolith
  const useRemoteDev = !monolith && Boolean(authProxyTarget || env.VITE_LOCAL_PYAI)

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

  // 本地开发用自签证书：让 IP/局域网访问走 https（避免浏览器 HSTS 强制升级）
  // dev server 默认启用 https；CI / 生产 build 不受影响
  const useHttps = process.env.NODE_ENV !== 'production'
  if (useHttps) {
    plugins.push(
      basicSsl({
        name: 'novel-agent-dev',
        domains: ['10.9.16.1', 'localhost', '127.0.0.1', '0.0.0.0'],
      }),
    )
  }
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
    plugins.push(
      viteObfuscatorPlugin({
        heavy: javascriptObfuscatorHeavyOptions(),
        light: javascriptObfuscatorLightOptions(),
      }),
    )
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
          // 产物文件名仅 content-hash，不暴露模块/页面名
          entryFileNames: 'assets/[hash].js',
          chunkFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash][extname]',
          manualChunks(id) {
            const norm = id.replace(/\\/g, '/')
            if (norm.includes('/src/security/')) {
              return SECURITY_CHUNK_NAME
            }
            if (!norm.includes('node_modules')) return
            if (id.includes('recharts') || id.includes('d3-')) return 'recharts'
            if (
              id.includes('reagraph') ||
              id.includes('/three/') ||
              id.includes('@react-three/')
            ) {
              return 'graph3d'
            }
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('/gsap')) return 'gsap'
            if (
              id.includes('streamdown') ||
              id.includes('@streamdown') ||
              id.includes('react-markdown') ||
              id.includes('remark-')
            ) {
              return 'markdown'
            }
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
      'import.meta.env.VITE_SECURITY_ENCRYPT_STREAM': JSON.stringify(securityEncryptStream),
    },
    test: {
      globals: false,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'config/**/*.test.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // streamdown / @streamdown/* 与主应用必须共用同一份 React，否则 Invalid hook call
      dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'streamdown',
        '@streamdown/cjk',
        '@streamdown/code',
        'reagraph',
        'three',
        '@react-three/fiber',
        '@react-spring/three',
      ],
      esbuildOptions: {
        target: 'esnext',
      },
    },
    server: {
      host: true,
      port: 3000,
      proxy: apiProxy,
    },
  }
})
