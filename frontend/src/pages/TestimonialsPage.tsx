import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <MarketingNav />
      <main className="flex-1 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            用户评价
          </h1>
          <p className="text-lg text-muted-foreground">
            听听其他创作者是如何使用 Novel Agent 的。
          </p>
          <div className="grid md:grid-cols-2 gap-8 mt-16 text-left">
            <div className="bg-white p-8 rounded-3xl border border-border shadow-soft">
              <div className="flex gap-1 text-warning mb-4">★★★★★</div>
              <p className="text-foreground text-lg mb-6">"这是我用过最懂网文的 AI 工具。它的世界观记忆功能帮我解决了一直以来的设定吃书问题。"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">玄</div>
                <div>
                  <div className="font-bold text-sm">玄幻小说作者</div>
                  <div className="text-xs text-muted-foreground">已创作 200万字</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-border shadow-soft">
              <div className="flex gap-1 text-warning mb-4">★★★★★</div>
              <p className="text-foreground text-lg mb-6">"大纲推演功能太强大了！卡文的时候让它帮忙理一理思路，马上就能找到突破口。"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">科</div>
                <div>
                  <div className="font-bold text-sm">科幻小说作者</div>
                  <div className="text-xs text-muted-foreground">已创作 80万字</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <HomeFooterSection />
    </div>
  )
}
