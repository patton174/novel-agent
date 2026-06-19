# Part 4 — 前端实现计划

> 主索引：[2026-06-19-library.md](./2026-06-19-library.md) ｜ [Part 3](./2026-06-19-library-part3-python.md)
> 设计：[册2 §5](../specs/2026-06-19-library-design-part2.md)
> 约定：`secureFetch`/`parseResultResponse`；`toGatewayStreamBody` 直传字段。前端测试 `cd frontend && npx vitest run`；`npx tsc --noEmit`。

---

## Task 13: libraryApi + types

**Files:**
- Create: `frontend/src/api/libraryApi.ts`
- Modify: `frontend/src/types/agent.ts`（AgentStreamRequestBody 加 referenced_books）

- [ ] **Step 1: 写 libraryApi.ts**

```ts
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface SelectableBook {
  catalogNovelId: string
  title: string
  author?: string | null
  summary?: string | null
  chapterCount?: number
  indexStatus: string
  source?: string | null
}

export async function fetchSelectableBooks(query?: string): Promise<SelectableBook[]> {
  const q = query ? `?query=${encodeURIComponent(query)}` : ''
  const res = await secureFetch(`/api/content/auth/catalog/my-library/selectable${q}`)
  if (!res.ok) throw new Error('加载书库失败')
  return parseResultResponse<SelectableBook[]>(res)
}
```

- [ ] **Step 2: types/agent.ts 加 referenced_books**

`AgentStreamRequestBody`（types/agent.ts:221-240）加：
```ts
  referenced_books?: Array<{ catalogNovelId: string }>
```

- [ ] **Step 3: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "libraryApi.ts|agent.ts" || echo "no new errors"
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/api/libraryApi.ts frontend/src/types/agent.ts
git commit -m "feat(library): libraryApi + AgentStreamRequestBody.referenced_books"
```

---

## Task 14: ReferenceBookPicker

**Files:**
- Create: `frontend/src/components/editor/ReferenceBookPicker.tsx`

> @mention 选择器：输入 `@` 触发弹窗，列书库书，选中后回调插入【书名】+ 记录 catalogNovelId。

- [ ] **Step 1: 写组件**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { fetchSelectableBooks, type SelectableBook } from '@/api/libraryApi'
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
      .then((list) => { if (!cancelled) setBooks(list) })
      .catch(() => { if (!cancelled) setBooks([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, query])

  if (!open) return null

  return (
    <div ref={ref} className="absolute bottom-full left-0 z-50 mb-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
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
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40"
            onClick={() => { onPick(b); onClose() }}
          >
            <span className="truncate">{b.title}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
              {b.indexStatus === 'indexed' ? '✓' : b.indexStatus === 'indexing' ? '⏳' : b.indexStatus === 'failed' ? '⚠' : ''}
            </span>
          </button>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep ReferenceBookPicker || echo "no errors"
git add frontend/src/components/editor/ReferenceBookPicker.tsx
git commit -m "feat(library): ReferenceBookPicker @mention 选择器"
```

---

## Task 15: ChatComposer 接入 picker + 发送带 referenced_books

**Files:**
- Modify: `frontend/src/components/chat/ChatComposer.tsx`
- Modify: `frontend/src/hooks/editor/useEditorAgentStream.ts`

- [ ] **Step 1: ChatComposer 接入 picker + referenced state**

`ChatComposer` 加 props `referencedBooks` + `onReferencedBooksChange`，textarea `onChange` 检测 `@` 触发 picker：
```tsx
  // 新增 props
  referencedBooks: Array<{ catalogNovelId: string; title: string }>
  onReferencedBooksChange: (books: Array<{ catalogNovelId: string; title: string }>) => void

  // state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')

  // onChange 改：检测 @ 触发
  const handleChange = (e) => {
    const v = e.target.value
    onChange(v)
    const lastAt = v.lastIndexOf('@')
    if (lastAt >= 0 && v.slice(lastAt + 1).indexOf(' ') < 0) {
      setPickerQuery(v.slice(lastAt + 1))
      setPickerOpen(true)
    } else {
      setPickerOpen(false)
    }
  }

  // onPick：把 @query 替换为【书名】+ 记录
  const handlePick = (book) => {
    const v = value
    const lastAt = v.lastIndexOf('@')
    const newVal = v.slice(0, lastAt) + `【${book.title}】` + v.slice(lastAt + 1 + pickerQuery.length)
    onChange(newVal)
    onReferencedBooksChange([...referencedBooks, { catalogNovelId: book.catalogNovelId, title: book.title }])
    setPickerOpen(false)
  }
```
textarea 包相对定位容器，内放 `<ReferenceBookPicker open={pickerOpen} query={pickerQuery} onPick={handlePick} onClose={() => setPickerOpen(false)} />`。
徽章区（textarea 上方）显示已引用书 + 移除按钮：
```tsx
  {referencedBooks.length > 0 ? (
    <div className="flex flex-wrap gap-1 px-2 py-1">
      {referencedBooks.map((b, i) => (
        <span key={b.catalogNovelId} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
          📖{b.title}
          <button onClick={() => onReferencedBooksChange(referencedBooks.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
    </div>
  ) : null}
```

- [ ] **Step 2: useEditorAgentStream 发送带 referenced_books**

`useEditorAgentStream.ts:878` `openAgentStream({...})` 加：
```ts
  referenced_books: referencedBooksRef.current?.map((b) => ({ catalogNovelId: b.catalogNovelId })) || undefined,
```
（`referencedBooksRef` 由 EditorChatPanel 传入/管理；发送后清空。）

- [ ] **Step 3: EditorChatPanel 透传 referenced state**

`EditorChatPanel.tsx` 渲染 `<ChatComposer>` 处加 `referencedBooks`/`onReferencedBooksChange` props，state 由 panel 或 useEditorAgentStream 持有。

- [ ] **Step 4: 类型检查 + dev 验证 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "ChatComposer|useEditorAgentStream|EditorChatPanel" || echo "no errors"
```
`npm run dev`，聊天区打 `@` → picker → 选书 → 【书名】+ 徽章 → 发送。

```bash
git add frontend/src/components/chat/ChatComposer.tsx frontend/src/hooks/editor/useEditorAgentStream.ts frontend/src/components/editor/EditorChatPanel.tsx
git commit -m "feat(library): ChatComposer 接入 @picker + 发送带 referenced_books"
```

---

## Task 16: MyLibraryPage 索引徽章 + i18n + E2E

**Files:**
- Modify: `frontend/src/pages/dashboard/MyLibraryPage.tsx`（模块5 页面）
- Modify: `frontend/src/i18n/locales/zh/editor.json` + `en/editor.json`

- [ ] **Step 1: MyLibraryPage 加索引徽章**

模块5 MyLibraryPage 列表每书加 `indexStatus` 徽章（pending/indexing/indexed/failed）。`CatalogNovelDTO` 已含 indexStatus（T1 后）。

- [ ] **Step 2: zh editor.json 加 reference 组**

```json
"reference": {
  "pickTitle": "选择参考书目",
  "empty": "书库无匹配书目"
}
```

- [ ] **Step 3: en editor.json 加对应英文**

```json
"reference": {
  "pickTitle": "Select reference book",
  "empty": "No matching book in library"
}
```

- [ ] **Step 4: 端到端验证**

```bash
cd d:/Users/JZJ/Desktop/agent && powershell -ExecutionPolicy Bypass -File scripts/_restart-dev-stack.ps1
```
1. 我的书库上传一本书 → 解析(模块5) → 自动 LIBRARY_INDEX → index_status=indexed + 摘要生成
2. 聊天区打 `@` → 选书 → 【书名】+ 徽章
3. 发消息 → agent trace 见 RUN_CONTEXT_JSON `library` 区块（摘要+目录）
4. agent 调 SearchKnowledge(scope=book:xxx) → 检索该书片段

- [ ] **Step 5: 全量测试回归 + 提交**

```bash
cd frontend && npx vitest run 2>&1 | tail -8
cd ../python-ai && python -m pytest tests/test_library_summarize.py tests/test_search_knowledge_scope.py -q
git add frontend/src/pages/dashboard/MyLibraryPage.tsx frontend/src/i18n/locales/zh/editor.json frontend/src/i18n/locales/en/editor.json
git commit -m "feat(library): MyLibraryPage 索引徽章 + i18n + E2E 收尾"
```

---

Part 4 完成。模块 4 全部实现完毕。

返回 [主索引](./2026-06-19-library.md)。
