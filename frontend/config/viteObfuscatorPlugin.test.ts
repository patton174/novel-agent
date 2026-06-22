import { describe, expect, it } from 'vitest'
import type { RenderedChunk } from 'rollup'
import { resolveObfuscatorTier } from './viteObfuscatorPlugin'
import { SECURITY_CHUNK_NAME } from './obfuscator'

function chunk(partial: Partial<RenderedChunk> & { name?: string }): RenderedChunk {
  return {
    fileName: 'assets/deadbeef.js',
    name: partial.name ?? 'EditorPage',
    isEntry: false,
    isDynamicEntry: false,
    isImplicitEntry: false,
    facadeModuleId: null,
    moduleIds: [],
    exports: [],
    imports: [],
    importedBindings: {},
    dynamicImports: [],
    modules: {},
    type: 'chunk',
    ...partial,
  } as RenderedChunk
}

describe('resolveObfuscatorTier', () => {
  it('uses heavy obfuscation for security bundle', () => {
    expect(
      resolveObfuscatorTier(chunk({ name: SECURITY_CHUNK_NAME }), 'export const x = 1'),
    ).toBe('heavy')
  })

  it('skips vendor and interactive page chunks', () => {
    expect(resolveObfuscatorTier(chunk({ name: 'radix' }), 'code')).toBe('skip')
    expect(resolveObfuscatorTier(chunk({ name: 'LoginPage' }), 'code')).toBe('skip')
  })

  it('skips chunks with vite lazy map deps', () => {
    expect(
      resolveObfuscatorTier(chunk({ name: 'EditorPage' }), 'const x = __vite__mapDeps([])'),
    ).toBe('skip')
  })

  it('uses light obfuscation for other app chunks', () => {
    expect(resolveObfuscatorTier(chunk({ name: 'EditorPage' }), 'export function ok() {}')).toBe(
      'light',
    )
  })
})
