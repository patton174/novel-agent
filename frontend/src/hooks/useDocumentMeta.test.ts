import { createElement, type ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { useThemeStore } from '@/stores/themeStore'
import { useDocumentMeta } from './useDocumentMeta'

function renderDocumentMeta(initialPath = '/') {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      I18nextProvider,
      { i18n },
      createElement(MemoryRouter, { initialEntries: [initialPath] }, children),
    )

  return renderHook(() => useDocumentMeta(), { wrapper })
}

beforeEach(async () => {
  await i18n.changeLanguage('zh')
  useThemeStore.setState({ theme: 'light' })
  document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/novel-icon.svg" />'
  document.title = 'Novel Agent'
  document.documentElement.lang = 'zh-CN'
})

afterEach(() => {
  useThemeStore.setState({ theme: 'light' })
})

describe('useDocumentMeta', () => {
  it('sets zh document title and lang for pricing', async () => {
    renderDocumentMeta('/pricing')

    await waitFor(() => {
      expect(document.title).toBe('产品定价 · 墨言')
      expect(document.documentElement.lang).toBe('zh-CN')
    })
  })

  it('updates title when locale changes', async () => {
    renderDocumentMeta('/pricing')

    await waitFor(() => {
      expect(document.title).toBe('产品定价 · 墨言')
    })

    await i18n.changeLanguage('en')

    await waitFor(() => {
      expect(document.title).toBe('Pricing · Moyan')
      expect(document.documentElement.lang).toBe('en')
    })
  })

  it('switches favicon when resolved theme is dark', async () => {
    useThemeStore.setState({ theme: 'dark' })
    renderDocumentMeta('/')

    await waitFor(() => {
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      expect(icon?.href).toContain('/novel-icon-dark.svg')
    })
  })

  it('uses light favicon when theme is light', async () => {
    useThemeStore.setState({ theme: 'light' })
    renderDocumentMeta('/')

    await waitFor(() => {
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      expect(icon?.href).toContain('/novel-icon.svg')
      expect(icon?.href).not.toContain('/novel-icon-dark.svg')
    })
  })
})
