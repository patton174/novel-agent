import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../../../utils/auth'
import { ArrowIcon } from '../icons'

export function HomeHeroSection() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const goStart = () => navigate(isLoggedIn() ? '/dashboard' : '/login')

  const content = (
    <div className="relative max-w-5xl mx-auto px-6 text-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-8 leading-tight">
        专为小说创作打造的 Agent<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">理解你的笔触与灵感</span>
      </h1>
      
      <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
        从世界观构建到章节续写 — 思维链、编排、子代理、流式成稿，一站完成。
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button 
          onClick={goStart}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary-hover transition-all hover:-translate-y-1 shadow-md hover:shadow-lg"
        >
          开始创作
          <ArrowIcon />
        </button>
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 bg-white text-foreground border border-border px-8 py-4 rounded-full text-lg font-semibold hover:bg-surface-hover transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
        >
          登录账号
        </button>
      </div>
    </div>
  )

  return (
    <section id="hero" className="relative overflow-hidden bg-background min-h-screen flex items-center justify-center pt-16">
      {reduced ? (
        content
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {content}
        </motion.div>
      )}
    </section>
  )
}
