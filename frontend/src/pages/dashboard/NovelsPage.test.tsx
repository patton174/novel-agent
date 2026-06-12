import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNovels, type DashboardNovel } from '@/api/dashboardApi'
import { dashboardCache } from '@/stores/dashboardCacheStore'
import NovelsPage from './NovelsPage'

vi.mock('@/api/dashboardApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/dashboardApi')>()
  return {
    ...actual,
    fetchNovels: vi.fn(),
    generateNovelCover: vi.fn(),
  }
})

const sampleNovel: DashboardNovel = {
  id: 'n1',
  title: '缓存作品',
  targetChapterWords: 3000,
  createdAt: 1,
  updatedAt: 1,
}

describe('NovelsPage', () => {
  beforeEach(() => {
    dashboardCache.invalidateAll()
    vi.mocked(fetchNovels).mockResolvedValue([sampleNovel])
  })

  it('skips skeleton when dashboard cache is warm', () => {
    dashboardCache.setNovels([sampleNovel])
    render(
      <MemoryRouter initialEntries={['/dashboard/novels']}>
        <NovelsPage />
      </MemoryRouter>,
    )
    expect(screen.queryByLabelText('加载中')).not.toBeInTheDocument()
    expect(screen.getByText('共 1 部作品')).toBeInTheDocument()
  })

  it('shows skeleton on cold load then renders data', async () => {
    vi.mocked(fetchNovels).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([sampleNovel]), 30)
        }),
    )
    render(
      <MemoryRouter initialEntries={['/dashboard/novels']}>
        <NovelsPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByLabelText('加载中').length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(screen.getByText('共 1 部作品')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('加载中')).not.toBeInTheDocument()
  })
})
