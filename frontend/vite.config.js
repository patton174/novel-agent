import { createRequire } from 'node:module';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { isCodeObfuscationEnabled, javascriptObfuscatorOptions, terserMinifyOptions, } from './config/obfuscator';
import { viteObfuscatorPlugin } from './config/viteObfuscatorPlugin';
export default defineConfig(function (_a) {
    var _b, _c;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var monolith = env.VITE_MONOLITH === 'true' ||
        env.VITE_MONOLITH === '1' ||
        process.env.VITE_MONOLITH === 'true';
    var codeObfuscation = isCodeObfuscationEnabled(mode, env);
    var securityDefault = mode === 'production' ? 'true' : 'false';
    var securityAes = env.VITE_SECURITY_AES ||
        process.env.VITE_SECURITY_AES ||
        securityDefault;
    var routeObfuscation = env.VITE_ROUTE_OBFUSCATION ||
        process.env.VITE_ROUTE_OBFUSCATION ||
        securityDefault;
    var fieldEncryption = env.VITE_FIELD_ENCRYPTION ||
        process.env.VITE_FIELD_ENCRYPTION ||
        securityDefault;
    var securityEncryptStream = env.VITE_SECURITY_ENCRYPT_STREAM ||
        process.env.VITE_SECURITY_ENCRYPT_STREAM ||
        securityDefault;
    var directPython = env.VITE_DIRECT_PYTHON === 'true' || env.VITE_DIRECT_PYTHON === '1';
    var remoteGateway = (_b = env.VITE_REMOTE_GATEWAY) === null || _b === void 0 ? void 0 : _b.replace(/\/$/, '');
    /** 认证直连地址（推荐 :8081），避免网关 lb 无实例时 503 */
    var remoteAuth = (_c = env.VITE_REMOTE_AUTH) === null || _c === void 0 ? void 0 : _c.replace(/\/$/, '');
    var authProxyTarget = remoteAuth || remoteGateway;
    var localPyai = env.VITE_LOCAL_PYAI || 'http://127.0.0.1:8082';
    var localContent = env.VITE_LOCAL_CONTENT || 'http://127.0.0.1:8091';
    var localBilling = env.VITE_LOCAL_BILLING || 'http://127.0.0.1:8092';
    var localMonolith = env.VITE_LOCAL_MONOLITH || 'http://127.0.0.1:8080';
    var apiProxyTarget = directPython ? 'http://127.0.0.1:8000' : localMonolith;
    var useRemoteDev = !monolith && Boolean(authProxyTarget || env.VITE_LOCAL_PYAI);
    var apiProxy = useRemoteDev
        ? {
            '/api/auth': {
                target: authProxyTarget,
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
        };
    var plugins = [react(), tailwindcss()];
    if (process.env.ANALYZE === 'true') {
        try {
            var require_1 = createRequire(import.meta.url);
            var visualizer = require_1('rollup-plugin-visualizer').visualizer;
            plugins.push(visualizer({
                filename: 'dist/stats.html',
                gzipSize: true,
                brotliSize: true,
                open: false,
            }));
        }
        catch (_d) {
            console.warn('[analyze] rollup-plugin-visualizer not installed; run pnpm install');
        }
    }
    if (codeObfuscation) {
        plugins.push(viteObfuscatorPlugin(javascriptObfuscatorOptions()));
    }
    return {
        plugins: plugins,
        build: {
            sourcemap: !codeObfuscation,
            minify: codeObfuscation ? 'terser' : 'esbuild',
            terserOptions: codeObfuscation ? terserMinifyOptions() : undefined,
            chunkSizeWarningLimit: codeObfuscation ? 1200 : 500,
            rollupOptions: {
                output: {
                    chunkFileNames: function (chunkInfo) {
                        var _a;
                        if ((_a = chunkInfo.facadeModuleId) === null || _a === void 0 ? void 0 : _a.includes('RouteFallbackShell')) {
                            return 'assets/route-shells-[hash].js';
                        }
                        return 'assets/[name]-[hash].js';
                    },
                    manualChunks: function (id) {
                        if (!id.includes('node_modules'))
                            return;
                        if (id.includes('recharts') || id.includes('d3-'))
                            return 'recharts';
                        if (id.includes('framer-motion'))
                            return 'motion';
                        if (id.includes('/gsap'))
                            return 'gsap';
                        if (id.includes('react-markdown') || id.includes('remark-'))
                            return 'markdown';
                        if (id.includes('@radix-ui') || id.includes('radix-ui'))
                            return 'radix';
                        if (id.includes('lucide-react'))
                            return 'icons';
                        if (id.includes('i18next'))
                            return 'i18n';
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
    };
});
