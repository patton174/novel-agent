import { Link } from 'react-router-dom'
import { NovelAiWordmark } from './NovelAiWordmark'

export function MarketingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between" aria-label="主导航">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80" aria-label="Novel AI 首页">
          <NovelAiWordmark size="sm" animate={false} />
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/features" className="hover:text-foreground transition-colors">功能特性</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">产品定价</Link>
            <Link to="/testimonials" className="hover:text-foreground transition-colors">用户评价</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2"
            >
              登录
            </Link>
            <Link 
              to="/register" 
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary-hover transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
            >
              免费开始
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
