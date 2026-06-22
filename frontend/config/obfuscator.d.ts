import type { ObfuscatorOptions } from 'javascript-obfuscator';
export declare const SECURITY_CHUNK_NAME = "__sec__";
export declare function isCodeObfuscationEnabled(mode: string, env: Record<string, string>): boolean;
export declare function javascriptObfuscatorHeavyOptions(): ObfuscatorOptions;
export declare function javascriptObfuscatorLightOptions(): ObfuscatorOptions;
export declare function javascriptObfuscatorOptions(): ObfuscatorOptions;
export declare function terserMinifyOptions(): {
    compress: {
        passes: number;
        pure_funcs: string[];
    };
    mangle: {
        toplevel: boolean;
        safari10: boolean;
    };
    format: {
        comments: boolean;
        ascii_only: boolean;
    };
};
