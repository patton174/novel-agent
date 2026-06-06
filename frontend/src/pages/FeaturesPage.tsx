import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <MarketingNav />
      <main className="flex-1 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            功能特性
          </h1>
          <p className="text-lg text-muted-foreground">
            探索 Novel Agent 如何通过 AI 赋能你的小说创作全流程。
          </p>
          <div className="grid md:grid-cols-2 gap-8 mt-16 text-left">
            <div className="bg-white p-8 rounded-3xl border border-border shadow-soft">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl mb-6">✍️</div>
              <h3 className="text-xl font-bold mb-3">智能续写</h3>
              <p className="text-muted-foreground">根据上下文语境，智能推断剧情走向，生成符合你文风的章节内容。</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-border shadow-soft">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl mb-6">🧠</div>
              <h3 className="text-xl font-bold mb-3">世界观记忆</h3>
              <p className="text-muted-foreground">自动提取并记忆角色、势力、地点等设定，确保长篇创作不吃书。</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-border shadow-soft">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl mb-6">📋</div>
              <h3 className="text-xl font-bold mb-3">大纲推演</h3>
              <p className="text-muted-foreground">一键生成故事大纲，分析剧情冲突，提供专业的编排建议。</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-border shadow-soft">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl mb-6">⚡</div>
              <h3 className="text-xl font-bold mb-3">多代理协作</h3>
              <p className="text-muted-foreground">主代理负责统筹，子代理负责检索和生成，大幅提升创作效率。</p>
            </div>
          </div>
        </div>
      </main>
      <HomeFooterSection />
    </div>
  )
}
