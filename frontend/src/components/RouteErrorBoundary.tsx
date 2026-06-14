import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { BRAND_NAME } from '@/lib/brand'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

function isChunkLoadError(error: Error): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /Loading chunk .* failed/i.test(error.message) ||
    /Importing a module script failed/i.test(error.message)
  )
}

/** 捕获路由/懒加载渲染错误，避免生产环境静默白屏 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RouteErrorBoundary]', error, info.componentStack)
  }

  private handleRetry = (): void => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      sessionStorage.removeItem('na_chunk_reload')
    }
    this.setState({ error: null })
    window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }

    const chunkError = isChunkLoadError(error)

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <p className="text-xl font-semibold tracking-tight">
          {BRAND_NAME.split(' ')[0]} <span className="text-primary">{BRAND_NAME.split(' ').slice(1).join(' ')}</span>
        </p>
        <h1 className="text-base font-medium">
          {chunkError ? i18n.t('common:feedback.errorPageUpdated') : i18n.t('common:feedback.errorPageFailed')}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {chunkError
            ? i18n.t('common:feedback.errorPageUpdatedDesc')
            : error.message || i18n.t('common:feedback.errorPageUnknown')}
        </p>
        <Button type="button" onClick={this.handleRetry}>
          {i18n.t('common:feedback.errorPageRefresh')}
        </Button>
      </div>
    )
  }
}
