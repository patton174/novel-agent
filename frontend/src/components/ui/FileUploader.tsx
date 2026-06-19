import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from './button'
import { appToast } from '@/stores/appToastStore'
import { retryParse } from '@/api/uploadApi'
import { useUploadProgress } from '@/hooks/useUploadProgress'
import { getAuthHeaders } from '@/utils/auth'
import { parseResultResponse } from '@/utils/resultApi'
import { useTranslation } from 'react-i18next'
import type { UploadedFile } from '@/types/file'

interface FileUploaderProps {
  onUploaded: (f: UploadedFile) => void
  onResolved: (f: UploadedFile) => void
}

const UPLOAD_URL = '/api/content/auth/upload/file'

/** 把 XHR 响应文本包成 Response，复用 parseResultResponse 的错误映射与 envelope 解包。 */
async function parseXhrResult(xhr: XMLHttpRequest): Promise<UploadedFile> {
  const response = new Response(xhr.responseText, {
    status: xhr.status,
    headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') ?? 'application/json' },
  })
  return parseResultResponse<UploadedFile>(response)
}

export function FileUploader({ onUploaded, onResolved }: FileUploaderProps) {
  const { t } = useTranslation(['dashboard'])
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [last, setLast] = useState<UploadedFile | null>(null)
  const tracked = useUploadProgress(last, onResolved)

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    try {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setUploadPct(Math.round((ev.loaded / ev.total) * 100))
        }
      }
      const result = await new Promise<UploadedFile>((resolve, reject) => {
        xhr.open('POST', UPLOAD_URL)
        xhr.withCredentials = true
        // secureFetch 不便拿 upload progress，这里用裸 xhr；鉴权头由 getAuthHeaders 注入，
        // 与 secureFetch 保持一致。当前上传走 FormData 不加密/不签名，此处可接受。
        const headers = getAuthHeaders()
        for (const [k, v] of Object.entries(headers)) {
          xhr.setRequestHeader(k, v)
        }
        xhr.onload = async () => {
          if (xhr.status === 409) {
            reject(new Error('上传数量已达套餐上限'))
            return
          }
          if (xhr.status >= 400) {
            try {
              await parseXhrResult(xhr) // 会抛出解析后的错误信息
            } catch (err) {
              reject(err instanceof Error ? err : new Error('上传失败'))
              return
            }
            reject(new Error('上传失败'))
            return
          }
          try {
            resolve(await parseXhrResult(xhr))
          } catch (err) {
            reject(err instanceof Error ? err : new Error('上传失败'))
          }
        }
        xhr.onerror = () => reject(new Error(t('myLibrary.uploadFail')))
        const form = new FormData()
        form.append('file', file)
        xhr.send(form)
      })
      setLast(result)
      onUploaded(result)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('myLibrary.uploadFail'))
    } finally {
      setUploading(false)
    }
  }

  const handleRetry = async () => {
    if (!last) return
    try {
      const r = await retryParse(last.fileId)
      setLast(r)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '重试失败')
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.markdown,.epub,.pdf,.docx"
        className="hidden"
        onChange={(e) => void handleChange(e)}
      />
      {uploading ? (
        <div>
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          <div className="mt-2 h-1.5 w-full max-w-xs mx-auto overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{uploadPct}%</p>
        </div>
      ) : (
        <Button variant="outline" onClick={handlePick}>
          <Upload className="mr-2 size-4" />
          {t('myLibrary.uploadButton')}
        </Button>
      )}

      {tracked && tracked.status !== 'ready' && !uploading ? (
        <div className="mt-4 text-sm">
          {tracked.status === 'parsing' ? (
            <>
              <Loader2 className="mr-1 inline size-4 animate-spin" />
              {t('myLibrary.parsing', { progress: tracked.progress ?? 0 })}
              <div className="mt-1 h-1.5 w-full max-w-xs mx-auto overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${tracked.progress ?? 0}%` }}
                />
              </div>
            </>
          ) : null}
          {tracked.status === 'pending' ? (
            <span className="text-muted-foreground">{t('myLibrary.pending')}</span>
          ) : null}
          {tracked.status === 'failed' ? (
            <div className="text-destructive">
              <XCircle className="mr-1 inline size-4" />
              {tracked.parseError || t('myLibrary.parseFail')}
              <Button variant="link" size="sm" onClick={() => void handleRetry()}>
                {t('myLibrary.retry')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tracked && tracked.status === 'ready' ? (
        <div className="mt-4 text-sm text-emerald-600">
          <CheckCircle2 className="mr-1 inline size-4" />
          {t('myLibrary.parseDone')}
        </div>
      ) : null}
    </div>
  )
}
