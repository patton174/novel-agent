import { Activity, BarChart3, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function BillingPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card className="py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          <CardTitle className="text-base font-semibold">本月用量</CardTitle>
          <CardDescription>Token 与 API 调用统计（演示数据）</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 px-6 py-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Activity className="size-4 shrink-0" />
                本月 Tokens
              </span>
              <span className="font-semibold tabular-nums text-foreground">124,592 / 1M</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                style={{ width: '12.4%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground">已使用 12.4%，配额每月 1 日重置</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="size-4 shrink-0" />
              API 调用
            </span>
            <span className="font-semibold tabular-nums text-foreground">3,402 次</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          <CardTitle className="text-base font-semibold">账单概览</CardTitle>
          <CardDescription>当前计费周期预估费用</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 px-6 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="size-4 shrink-0" />
                预估费用
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                ¥12.45
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              按量计费
            </span>
          </div>

          <Button className="h-10 w-full rounded-xl" variant="outline">
            <Receipt className="mr-2 size-4" />
            查看详细账单
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
