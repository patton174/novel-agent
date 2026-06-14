/** 编辑器路由约定 — Dashboard / 营销链统一引用 */
export const EDITOR_CREATE_HREF = '/editor?action=create'

export function editorNovelHref(novelId: string): string {
  return `/editor?novelId=${encodeURIComponent(novelId)}`
}
