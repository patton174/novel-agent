import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RouteErrorFallback } from '@/components/RouteErrorFallback'

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

    return (
      <RouteErrorFallback
        chunkError={isChunkLoadError(error)}
        message={error.message}
        onRetry={this.handleRetry}
      />
    )
  }
}
