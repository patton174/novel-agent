/** 生产构建默认开启；本地调试可 VITE_CODE_OBFUSCATION=false 关闭 */
export function isCodeObfuscationEnabled(mode, env) {
    var _a;
    var flag = (_a = env.VITE_CODE_OBFUSCATION) !== null && _a !== void 0 ? _a : process.env.VITE_CODE_OBFUSCATION;
    if (flag === 'false' || flag === '0')
        return false;
    if (flag === 'true' || flag === '1')
        return true;
    return mode === 'production';
}
/** Terser 压缩 + javascript-obfuscator 工业级混淆参数 */
export function javascriptObfuscatorOptions() {
    return {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.85,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.35,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        identifiersPrefix: '_0x',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        renameProperties: false,
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        stringArray: true,
        stringArrayCallsTransform: false,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayThreshold: 0.75,
        transformObjectKeys: false,
        unicodeEscapeSequence: false,
    };
}
export function terserMinifyOptions() {
    return {
        compress: {
            passes: 2,
            pure_funcs: ['console.debug'],
        },
        mangle: {
            toplevel: true,
            safari10: true,
        },
        format: {
            comments: false,
            ascii_only: false,
        },
    };
}
