import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'

export default function GenericContentPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <MarketingNav />
      <main className="flex-1 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-3xl shadow-soft border border-border">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">
            {title}
          </h1>
          <div className="prose prose-slate max-w-none text-muted-foreground">
            <p>这里是 {title} 的占位内容。在正式上线前，请替换为真实的法律/联系文案。</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <h3>1. 章节标题</h3>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            <h3>2. 章节标题</h3>
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
          </div>
        </div>
      </main>
      <HomeFooterSection />
    </div>
  )
}
