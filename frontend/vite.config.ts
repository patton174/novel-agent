import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const directPython =
    env.VITE_DIRECT_PYTHON === 'true' || env.VITE_DIRECT_PYTHON === '1'
  const remoteGateway = env.VITE_REMOTE_GATEWAY?.replace(/\/$/, '')
  /** 认证直连地址（推荐 :8081），避免网关 lb 无实例时 503 */
  const remoteAuth = env.VITE_REMOTE_AUTH?.replace(/\/$/, '')
  const authProxyTarget = remoteAuth || remoteGateway
  const localPyai = env.VITE_LOCAL_PYAI || 'http://127.0.0.1:8082'
  const localContent = env.VITE_LOCAL_CONTENT || 'http://127.0.0.1:8091'
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
      }
    : {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
        },
      }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              if (id.includes('/pages/marketing/') || id.includes('/components/marketing/')) {
                return 'marketing'
              }
              if (id.includes('/pages/Editor') || id.includes('/components/editor/')) {
                return 'editor'
              }
              if (id.includes('/components/agent/') || id.includes('/hooks/editor/')) {
                return 'agent'
              }
              return undefined
            }
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'vendor-react'
            }
            if (id.includes('styled-components') || id.includes('framer-motion') || id.includes('gsap')) {
              return 'vendor-ui'
            }
            if (id.includes('react-markdown') || id.includes('remark-') || id.includes('micromark')) {
              return 'vendor-markdown'
            }
            return 'vendor'
          },
        },
      },
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
