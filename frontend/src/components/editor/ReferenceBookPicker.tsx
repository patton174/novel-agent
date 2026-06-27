import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchSelectableBooks, type SelectableBook } from '@/api/libraryApi'
import { IndexStatusBadge } from '@/components/library/IndexStatusBadge'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  query: string
  onPick: (book: SelectableBook) => void
  onClose: () => void
}

export function ReferenceBookPicker({ open, query, onPick, onClose }: Props) {
  const { t } = useTranslation(['editor'])
  const [books, setBooks] = useState<SelectableBook[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchSelectableBooks(query)
      .then((list) => {
        if (!cancelled) setBooks(list)
      })
      .catch(() => {
        if (!cancelled) setBooks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, query])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        {t('editor:reference.pickTitle')}
      </div>
      {loading ? (
        <Loader2 className="m-3 size-4 animate-spin" />
      ) : books.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">{t('editor:reference.empty')}</div>
      ) : (
        books.map((b) => (
          <button
            key={b.catalogNovelId}
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40"
            onClick={() => {
              onPick(b)
              onClose()
            }}
          >
            <span className="truncate">{b.title}</span>
            <IndexStatusBadge indexStatus={b.indexStatus} compact />
          </button>
        ))
      )}
    </div>
  )
}
