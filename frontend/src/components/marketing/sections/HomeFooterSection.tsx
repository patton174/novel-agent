import { Link } from 'react-router-dom'
import { ArrowIcon } from '../icons'

const FOOTER_LINKS = {
  product: [
    { label: '功能特性', to: '/features' },
    { label: '产品定价', to: '/pricing' },
    { label: '用户评价', to: '/testimonials' },
  ],
  account: [
    { label: '登录', to: '/login' },
    { label: '免费注册', to: '/register' },
    { label: '创作台', to: '/editor' },
  ],
  legal: [
    { label: '隐私政策', to: '/privacy' },
    { label: '用户协议', to: '/terms' },
    { label: '联系我们', to: '/contact' },
  ],
} as const

export function HomeFooterSection() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative z-10 mt-4 w-full">
      {/* CTA */}
      <div className="border-y border-primary/20 bg-gradient-to-br from-primary via-indigo-600 to-indigo-700 px-6 py-14 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            准备好开始你的下一章了吗？
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
            注册即可体验编排、记忆、流式成稿等完整能力，让 AI 成为你最稳定的创作搭档。
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-primary shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-50"
            >
              免费注册
              <ArrowIcon />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              已有账号，直接登录
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-slate-900 px-6 py-12 text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="inline-block text-lg font-bold tracking-tight text-white">
              Novel<span className="text-indigo-400">AI</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              专为小说创作打造的智能 Agent，从世界观到章节续写，一站完成。
            </p>
          </div>

          <FooterLinkGroup title="产品" links={FOOTER_LINKS.product} />
          <FooterLinkGroup title="账号" links={FOOTER_LINKS.account} />
          <FooterLinkGroup title="条款" links={FOOTER_LINKS.legal} />
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {year} Novel Agent · 保留所有权利</p>
          <p>创作无限可能</p>
        </div>
      </div>
    </footer>
  )
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string
  links: readonly { label: string; to: string }[]
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
