# 仪表盘样式优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化用户仪表盘 6 处样式/行为：概览加 Token 消耗图、移除书库导航并在我的书库加跳转、我的小说/我的书库紧凑布局、账户设置与左下角去重且头像统一编辑页、弹幕每用户仅一次、热力图显示近 13 周。

**Architecture:** 前端为主（React + recharts + zustand + i18n），后端仅 `studio-module-billing` 加一条弹幕去重校验。Token 数据复用已有 `fetchUsageTrends` 接口；头像复用 `UserPixelAvatar`；布局沿用现有 `AppPageStack`/`AppShellCard` token。

**Tech Stack:** React 18, TypeScript, recharts ^2.15, zustand, react-i18next, Tailwind, Vitest；Spring Boot + Spring Data JPA（Java 后端单测 JUnit）。

**Spec:** `docs/superpowers/specs/2026-06-20-dashboard-style-optimization-design.md`

---

## 文件结构

| 文件 | 责任 | 操作 |
|------|------|------|
| `frontend/src/stores/dashboardCacheStore.ts` | 仪表盘数据 60s 缓存；新增 tokenTrends | Modify |
| `frontend/src/components/dashboard/DashboardTokenUsageChart.tsx` | 近 30 天 Token 消耗 AreaChart | Create |
| `frontend/src/pages/dashboard/DashboardHomePage.tsx` | 概览页：独立 effect 拉 token 图并插入布局 | Modify |
| `frontend/src/components/dashboard/AppSidebar.tsx` | 删 bookstore+settings 导航；左下角用户卡换像素头像 | Modify |
| `frontend/src/layouts/DashboardLayout.tsx` | profile 加载后同步像素头像 | Modify |
| `frontend/src/pages/dashboard/MyLibraryPage.tsx` | 卡片网格→列表行；加去书库跳转按钮 | Modify |
| `frontend/src/pages/dashboard/NovelsPage.tsx` | 卡片收紧 + 4 列 | Modify |
| `frontend/src/components/dashboard/SettingsFeedbackCard.tsx` | localStorage 永久锁 + 已评价态 | Modify |
| `frontend/src/components/dashboard/ActivityHeatmap.tsx` | `RECENT_WEEKS=13` | Modify |
| `frontend/src/i18n/locales/zh/dashboard.json` | 新文案 | Modify |
| `frontend/src/i18n/locales/en/dashboard.json` | 新文案 | Modify |
| `novel-studio/.../billing/repository/SiteDanmakuRepository.java` | `existsByUserId` | Modify |
| `novel-studio/.../billing/service/biz/SiteDanmakuBiz.java` | create 去重校验 | Modify |
| `novel-studio/.../billing/service/biz/SiteDanmakuBizTest.java` | 去重单测 | Create |

---

## Task 1: 热力图显示近 13 周

**Files:**
- Modify: `frontend/src/components/dashboard/ActivityHeatmap.tsx:14`

- [ ] **Step 1: 改 RECENT_WEEKS 常量**

把 `frontend/src/components/dashboard/ActivityHeatmap.tsx` 第 14 行：

```ts
const RECENT_WEEKS = 3
```

改为：

```ts
const RECENT_WEEKS = 13
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/dashboard/ActivityHeatmap.tsx
git commit -m "style(dashboard): 热力图显示近 13 周填满卡片宽度"
```

---

## Task 2: 弹幕去重 — 后端

**Files:**
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/SiteDanmakuRepository.java`
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/SiteDanmakuBiz.java`
- Create: `novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/SiteDanmakuBizTest.java`

- [ ] **Step 1: 写失败测试**

创建 `novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/SiteDanmakuBizTest.java`：

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteDanmakuCreateReq;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.module.billing.support.IpRegionResolver;
import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SiteDanmakuBizTest {

    @Test
    void rejectsDuplicateDanmakuForSameUser() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);
        when(repo.existsByUserId(7L)).thenReturn(true);

        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip);

        assertThatThrownBy(() -> biz.create(new SiteDanmakuCreateReq("重复评价"), 7L, "u7", "1.1.1.1"))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("已评价");
    }

    @Test
    void allowsGuestWithoutUserId() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);
        when(ip.resolveRegion(anyLong() == 0L ? "0" : "x")).thenReturn("北京");

        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip);
        // 访客（userId=null）不应触发去重，正常落库
        biz.create(new SiteDanmakuCreateReq("访客留言"), null, null, "1.1.1.1");
        org.mockito.Mockito.verify(repo, org.mockito.Mockito.never()).existsByUserId(org.mockito.ArgumentMatchers.anyLong());
    }
}
```

> 注：`SiteDanmakuCreateReq` 是 record `record SiteDanmakuCreateReq(String message)`。先确认其构造签名（见 Step 3 说明）。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd novel-studio && ./mvnw -pl studio-modules/studio-module-billing test -Dtest=SiteDanmakuBizTest -q`（Windows 用 `mvnw.cmd`）
Expected: 编译失败 — `existsByUserId` 方法不存在。

- [ ] **Step 3: 加 Repository 方法**

在 `SiteDanmakuRepository.java` 接口体内（`JpaRepository<SiteDanmakuEntity, Long>` 之后、现有方法旁）新增：

```java
    boolean existsByUserId(Long userId);
```

- [ ] **Step 4: Biz 加去重校验**

修改 `SiteDanmakuBiz.java` 的 `create` 方法。在 `if (message.length() < 2)` 校验之后、`SiteDanmakuEntity entity = new SiteDanmakuEntity();` 之前插入：

```java
        if (userId != null && userId > 0 && siteDanmakuRepository.existsByUserId(userId)) {
            throw new BizException(ResultCode.BAD_REQUEST, "已评价过，感谢支持");
        }
```

> `ResultCode` 与 `BizException` 已在文件顶部 import（见现有 `message.length() < 2` 分支用法一致）。

- [ ] **Step 5: 运行测试确认通过**

Run: `cd novel-studio && ./mvnw -pl studio-modules/studio-module-billing test -Dtest=SiteDanmakuBizTest -q`
Expected: PASS。

> 若 `SiteDanmakuCreateReq` 的构造不是 `(String message)`（如带更多字段），按实际 record 定义调整测试中 `new SiteDanmakuCreateReq(...)` 调用——读 `dto/SiteDanmakuCreateReq.java` 确认。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src
git commit -m "feat(billing): 弹幕每用户仅一次（existsByUserId 去重）"
```

---

## Task 3: 弹幕去重 — 前端已评价态 + i18n

**Files:**
- Modify: `frontend/src/components/dashboard/SettingsFeedbackCard.tsx`
- Modify: `frontend/src/i18n/locales/zh/dashboard.json`
- Modify: `frontend/src/i18n/locales/en/dashboard.json`

- [ ] **Step 1: 加 i18n 文案**

在 `frontend/src/i18n/locales/zh/dashboard.json` 的 `settings` 块内（`feedbackError` 行之后）加：

```json
    "feedbackAlreadySubmitted": "已评价"
```

（注意保持上一行 `feedbackError` 末尾逗号。）

在 `frontend/src/i18n/locales/en/dashboard.json` 对应 `settings.feedbackError` 之后加：

```json
    "feedbackAlreadySubmitted": "Submitted"
```

- [ ] **Step 2: 改写 SettingsFeedbackCard**

整体替换 `frontend/src/components/dashboard/SettingsFeedbackCard.tsx` 内容为：

```tsx
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { postDanmaku } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { useUserStore } from '@/stores/userStore'

const MIN_LEN = 2
const MAX_LEN = 200
const STORAGE_PREFIX = 'novelstudio:feedback:submitted:'

function submittedKey(userId: string | undefined): string | null {
  return userId ? `${STORAGE_PREFIX}${userId}` : null
}

function readSubmitted(userId: string | undefined): boolean {
  const key = submittedKey(userId)
  return key ? localStorage.getItem(key) === '1' : false
}

export function SettingsFeedbackCard() {
  const { t } = useTranslation(['dashboard'])
  const profile = useUserStore((s) => s.profile)
  const userId = profile?.userId
  const [submitted, setSubmitted] = useState<boolean>(() => readSubmitted(userId))
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (submitted) return
    const trimmed = message.trim()
    if (trimmed.length < MIN_LEN) {
      appToast.error(t('dashboard:settings.feedbackMinLength'))
      return
    }
    setSubmitting(true)
    try {
      await postDanmaku(trimmed.slice(0, MAX_LEN))
      const key = submittedKey(userId)
      if (key) localStorage.setItem(key, '1')
      setSubmitted(true)
      setMessage('')
      appToast.success(t('dashboard:settings.feedbackSent'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('dashboard:settings.feedbackError')
      appToast.error(msg)
      if (msg.includes('已评价')) {
        const key = submittedKey(userId)
        if (key) localStorage.setItem(key, '1')
        setSubmitted(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-emerald-500" />
        {t('dashboard:settings.feedbackAlreadySubmitted')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
        disabled={submitting}
        rows={4}
        maxLength={MAX_LEN}
        placeholder={t('dashboard:settings.feedbackPlaceholder')}
        className={cn(
          'min-h-[100px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      />
      <Button
        type="button"
        className={APP_BTN_FULL_MD}
        disabled={submitting || message.trim().length < MIN_LEN}
        onClick={() => void handleSubmit()}
      >
        {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {t('dashboard:settings.feedbackSubmit')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/SettingsFeedbackCard.tsx frontend/src/i18n/locales/zh/dashboard.json frontend/src/i18n/locales/en/dashboard.json
git commit -m "feat(dashboard): 评价提交后显示已评价，localStorage 永久锁防重复"
```

---

## Task 4: dashboardCacheStore 加 tokenTrends

**Files:**
- Modify: `frontend/src/stores/dashboardCacheStore.ts`
- Modify: `frontend/src/stores/dashboardCacheStore.test.ts`

- [ ] **Step 1: 写失败测试**

在 `frontend/src/stores/dashboardCacheStore.test.ts` 的 `describe('dashboardCache', ...)` 内末尾加：

```ts
  it('caches token trends', () => {
    const trend = [{ date: '2026-06-20', tokens: 1234, costMicros: 500 }]
    dashboardCache.setTokenTrends(trend)
    expect(dashboardCache.getTokenTrends()).toEqual(trend)
  })

  it('invalidateAll clears token trends', () => {
    dashboardCache.setTokenTrends([{ date: '2026-06-20', tokens: 1, costMicros: 0 }])
    dashboardCache.invalidateAll()
    expect(dashboardCache.getTokenTrends()).toBeNull()
  })
```

并在文件顶部 import 区把：

```ts
import type { DashboardNovel } from '@/api/dashboardApi'
```

改为：

```ts
import type { DashboardNovel } from '@/api/dashboardApi'
import type { UsageTrendPoint } from '@/api/billingApi'
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd frontend && npx vitest run src/stores/dashboardCacheStore.test.ts`
Expected: FAIL — `setTokenTrends`/`getTokenTrends` 不是函数。

- [ ] **Step 3: 实现 cache 字段**

修改 `frontend/src/stores/dashboardCacheStore.ts`：

顶部 import 改为：

```ts
import type { DashboardActivity, DashboardNovel, DashboardSummary, RecentNovel } from '@/api/dashboardApi'
import type { UsageTrendPoint } from '@/api/billingApi'
```

在 `let activityCache` 行之后加：

```ts
let tokenTrendsCache: CacheEntry<UsageTrendPoint[]> | null = null
```

在 `getActivity`/`setActivity` 之后、`invalidateAll` 之前加：

```ts
  getTokenTrends(): UsageTrendPoint[] | null {
    return fresh(tokenTrendsCache)
  },
  setTokenTrends(data: UsageTrendPoint[]): void {
    tokenTrendsCache = { data, at: Date.now() }
  },
```

在 `invalidateAll` 体内加 `tokenTrendsCache = null`（与其它清空并列）。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd frontend && npx vitest run src/stores/dashboardCacheStore.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/stores/dashboardCacheStore.ts frontend/src/stores/dashboardCacheStore.test.ts
git commit -m "feat(dashboard): dashboardCache 加 tokenTrends 缓存"
```

---

## Task 5: DashboardTokenUsageChart 组件 + i18n

**Files:**
- Create: `frontend/src/components/dashboard/DashboardTokenUsageChart.tsx`
- Modify: `frontend/src/i18n/locales/zh/dashboard.json`
- Modify: `frontend/src/i18n/locales/en/dashboard.json`

- [ ] **Step 1: 加 i18n 文案**

在 `frontend/src/i18n/locales/zh/dashboard.json` 的 `home` 块内（`wordCountWan` 行之前或之后均可，保持逗号正确）加：

```json
    "tokenTitle": "Token 消耗",
    "tokenDesc": "近 30 天 Token 使用量",
    "tokenEmpty": "暂无 Token 消耗数据",
    "tokenTooltip": "Tokens"
```

在 `frontend/src/i18n/locales/en/dashboard.json` 的 `home` 块内加：

```json
    "tokenTitle": "Token Usage",
    "tokenDesc": "Last 30 days of token consumption",
    "tokenEmpty": "No token usage data yet",
    "tokenTooltip": "Tokens"
```

- [ ] **Step 2: 创建组件**

创建 `frontend/src/components/dashboard/DashboardTokenUsageChart.tsx`：

```tsx
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { UsageTrendPoint } from '@/api/billingApi'
import { formatTokenCount } from '@/api/billingApi'
import { Skeleton } from '@/components/ui/skeleton'
import { formatChartAxisMetric } from '@/utils/dashboardMetrics'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

function formatChartDate(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

interface DashboardTokenUsageChartProps {
  points: UsageTrendPoint[]
  loading?: boolean
}

export function DashboardTokenUsageChart({ points, loading }: DashboardTokenUsageChartProps) {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  const series = useMemo(
    () => points.map((p) => ({ date: p.date, tokens: p.tokens, costMicros: p.costMicros })),
    [points],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('dashboard:home.tokenTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('dashboard:home.tokenDesc')}
          </p>
        </div>
      </div>

      <div className="relative flex-1 px-4 pb-4 pt-3 sm:px-6">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-xl md:h-[260px]" />
        ) : series.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground md:h-[260px]">
            {t('dashboard:home.tokenEmpty')}
          </div>
        ) : (
          <div className="h-[220px] w-full md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardTokenFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatChartDate(String(v), dateLocale)}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => formatChartAxisMetric(Number(v), dateLocale)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--surface))',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label) => formatChartDate(String(label), dateLocale)}
                  formatter={(value) => [
                    formatTokenCount(Number(value)),
                    t('dashboard:home.tokenTooltip'),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#dashboardTokenFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/DashboardTokenUsageChart.tsx frontend/src/i18n/locales/zh/dashboard.json frontend/src/i18n/locales/en/dashboard.json
git commit -m "feat(dashboard): 新建 Token 消耗趋势图组件"
```

---

## Task 6: 概览页接入 Token 图

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardHomePage.tsx`

- [ ] **Step 1: 接入数据与布局**

修改 `frontend/src/pages/dashboard/DashboardHomePage.tsx`：

(a) 顶部 import 区，在现有 import 之后追加：

```ts
import { fetchUsageTrends, type UsageTrendPoint } from '@/api/billingApi'
import { DashboardTokenUsageChart } from '@/components/dashboard/DashboardTokenUsageChart'
```

(b) 在 `const [activity, setActivity] = useState<DashboardActivity | null>(() => dashboardCache.getActivity())` 行之后加：

```ts
  const [tokenTrends, setTokenTrends] = useState<UsageTrendPoint[] | null>(() =>
    dashboardCache.getTokenTrends(),
  )
```

(c) 在现有 `useEffect(() => {...}, [])`（拉 summary/recent/activity 的那个）之后，新增独立 effect：

```ts
  useEffect(() => {
    let cancelled = false
    void fetchUsageTrends(30)
      .then((trends) => {
        if (cancelled) return
        dashboardCache.setTokenTrends(trends)
        setTokenTrends(trends)
      })
      .catch(() => {
        if (!cancelled) {
          setTokenTrends([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])
```

(d) 在 `const activityLoading = activity === null` 行之后加：

```ts
  const tokenLoading = tokenTrends === null
```

(e) 在 JSX 中，找到 KPI 行 `<div className="grid gap-4 md:grid-cols-3">...</div>` 结束之后、活动趋势/热力图行 `<div className="grid gap-4 xl:grid-cols-[...]">` 之前，插入：

```tsx
      <AppShellCard className="flex min-h-[320px] flex-col">
        <DashboardTokenUsageChart
          points={tokenTrends ?? []}
          loading={tokenLoading}
        />
      </AppShellCard>
```

- [ ] **Step 2: 类型检查**

Run: `cd frontend && npx tsc -p tsconfig.json --noEmit`
Expected: 无报错。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/dashboard/DashboardHomePage.tsx
git commit -m "feat(dashboard): 概览页加 Token 消耗图（独立 effect 隔离失败）"
```

---

## Task 7: AppSidebar 删导航 + 左下角头像统一

**Files:**
- Modify: `frontend/src/components/dashboard/AppSidebar.tsx`
- Modify: `frontend/src/layouts/DashboardLayout.tsx`

- [ ] **Step 1: 删 mainNav 两项**

在 `frontend/src/components/dashboard/AppSidebar.tsx` 的 `mainNav` 数组中：

- 删除 `{ label: t('common:nav.dashboardBookstore'), to: '/dashboard/bookstore', icon: BookMarked },`
- 删除 `{ label: t('common:nav.dashboardSettings'), to: '/dashboard/settings', icon: Settings },`

同时从顶部 lucide import 中移除不再使用的 `BookMarked` 和 `Settings`（保留其余）：

```ts
import {
  BookOpen,
  CreditCard,
  LayoutDashboard,
  Library,
} from 'lucide-react'
```

- [ ] **Step 2: 左下角用户卡换像素头像**

将 `AppSidebar.tsx` 底部 `<div className="border-t border-border p-3"> ... </div>` 整块替换为：

```tsx
        <div className="border-t border-border p-3">
          <NavLink
            to="/dashboard/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:from-muted/65 hover:via-muted/40',
                'bg-gradient-to-r from-muted/50 via-muted/30 to-transparent ring-1 ring-border/40',
                isActive && 'ring-2 ring-primary/25',
              )
            }
            title={t('common:nav.dashboardSettings')}
          >
            <div className="relative shrink-0">
              <PixelAvatarFrame size={40}>
                <UserPixelAvatar size={36} animated />
              </PixelAvatarFrame>
              {unverified ? (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sky-500 ring-2 ring-surface" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {profile?.username || t('common:nav.dashboardSettings')}
              </p>
              <p
                className={cn(
                  'mt-0.5 truncate text-xs',
                  unverified ? 'font-medium text-sky-700 dark:text-sky-300' : 'text-muted-foreground',
                )}
              >
                {unverified
                  ? t('common:nav.emailUnverified')
                  : profile?.email?.trim() || t('common:nav.dashboardSettings')}
              </p>
            </div>
          </NavLink>
        </div>
```

- [ ] **Step 3: 更新 import**

在 `AppSidebar.tsx` 顶部 import 区，移除不再使用的：

```ts
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
```

并新增（在 `useUserStore` import 附近）：

```ts
import { UserPixelAvatar } from '@/components/avatars/PixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'
```

同时删除现在不再使用的 `const initials = profile?.username?.slice(0, 2).toUpperCase() || '?'` 行。

- [ ] **Step 4: DashboardLayout 同步像素头像**

修改 `frontend/src/layouts/DashboardLayout.tsx`，在顶部 import 区加：

```ts
import { syncPixelAvatarForUser } from '@/stores/pixelAvatarStore'
```

把现有 `fetchUserInfo().then(...)` 内的 `.then((p) => { if (!cancelled) { setProfile(p) } })` 改为：

```ts
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
          void syncPixelAvatarForUser(p.userId)
        }
      })
```

- [ ] **Step 5: 类型检查 + 冒烟**

Run: `cd frontend && npx tsc -p tsconfig.json --noEmit`
Expected: 无报错。

Run: `cd frontend && npx vitest run src/lib/uiSmoke.test.ts`
Expected: PASS（确保无引用残留导致页面崩）。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/components/dashboard/AppSidebar.tsx frontend/src/layouts/DashboardLayout.tsx
git commit -m "style(dashboard): 删书库/设置导航项，左下角头像统一为像素头像"
```

---

## Task 8: 我的书库列表行布局 + 去书库跳转

**Files:**
- Modify: `frontend/src/pages/dashboard/MyLibraryPage.tsx`
- Modify: `frontend/src/i18n/locales/zh/dashboard.json`
- Modify: `frontend/src/i18n/locales/en/dashboard.json`

- [ ] **Step 1: 加 i18n**

在 `zh/dashboard.json` 的 `myLibrary` 块内加：

```json
    "browseBookstore": "去书库添加更多"
```

在 `en/dashboard.json` 的 `myLibrary` 块内加：

```json
    "browseBookstore": "Browse bookstore"
```

- [ ] **Step 2: 改 MyLibraryPage**

整体替换 `frontend/src/pages/dashboard/MyLibraryPage.tsx` 内容为：

```tsx
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Library, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileUploader } from '@/components/ui/FileUploader'
import { appToast } from '@/stores/appToastStore'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { fetchMyLibrary, getUploadQuota } from '@/api/uploadApi'
import type { CatalogNovel } from '@/api/catalogApi'
import type { UploadQuota } from '@/types/file'

export default function MyLibraryPage() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [quota, setQuota] = useState<UploadQuota | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, q] = await Promise.all([fetchMyLibrary(1, 50), getUploadQuota()])
      setNovels(page.list)
      setQuota(q)
    } catch (err) {
      setNovels([])
      appToast.error(err instanceof Error ? err.message : t('myLibrary.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const quotaText = quota
    ? quota.limit === 'unlimited'
      ? t('myLibrary.quotaUnlimited', { used: quota.used })
      : t('myLibrary.quota', { used: quota.used, limit: quota.limit })
    : ''

  const isLoading = novels === null || loading

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('myLibrary.eyebrow')}
        title={t('myLibrary.title')}
        icon={Library}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/bookstore">{t('myLibrary.browseBookstore')}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1 size-4" /> {t('myLibrary.refresh')}
            </Button>
          </div>
        }
      />
      {quotaText ? (
        <p className="text-sm text-muted-foreground">{quotaText}</p>
      ) : null}

      <FileUploader
        onUploaded={() => {
          /* 列表稍后轮询到 ready 再刷新 */
        }}
        onResolved={() => void load()}
      />

      {isLoading ? (
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-soft">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : novels && novels.length === 0 ? (
        <AppEmptyState title={t('myLibrary.empty')} icon={BookOpen} />
      ) : novels && novels.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {novels.map((novel) => (
            <article key={novel.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
                <BookOpen className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{novel.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {novel.author ? `${novel.author} · ` : ''}
                  {t('myLibrary.chapterCount', { count: novel.chapterCount })}
                </p>
              </div>
              <Button className="shrink-0" size="sm" onClick={() => void load()}>
                <Plus className="mr-1 size-4" /> {t('myLibrary.addToNovel')}
              </Button>
            </article>
          ))}
        </div>
      ) : null}
    </AppPageStack>
  )
}
```

- [ ] **Step 3: 类型检查**

Run: `cd frontend && npx tsc -p tsconfig.json --noEmit`
Expected: 无报错。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/dashboard/MyLibraryPage.tsx frontend/src/i18n/locales/zh/dashboard.json frontend/src/i18n/locales/en/dashboard.json
git commit -m "style(dashboard): 我的书库改列表行布局 + 去书库跳转"
```

---

## Task 9: 我的小说卡片紧凑 + 4 列

**Files:**
- Modify: `frontend/src/pages/dashboard/NovelsPage.tsx`

- [ ] **Step 1: 调整布局类名**

在 `frontend/src/pages/dashboard/NovelsPage.tsx` 做以下替换：

(a) 骨架行（loading 分支与正文 grid，两处一致）：

```
<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
```
→
```
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
```

（两处都改：loading 骨架 grid 与正文 novels grid。）

(b) 骨架高度：

```
<Skeleton key={i} className="min-h-[360px] rounded-2xl" />
```
→
```
<Skeleton key={i} className="min-h-[300px] rounded-2xl" />
```

(c) 卡片 article 内封面比例：

```
<div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
```
→
```
<div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
```

(d) 卡片正文容器：

```
<div className="flex flex-1 flex-col p-5">
```
→
```
<div className="flex flex-1 flex-col p-4">
```

(e) 标题：

```
className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-foreground"
```
→
```
className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-foreground"
```

(f) genre 标签 margin：

```
<span className="mb-3 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-ui-sm font-medium text-foreground/70">
```
→
```
<span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-ui-sm font-medium text-foreground/70">
```

(g) 底部操作区：

```
<div className="flex flex-col gap-2 border-t border-border/80 p-4">
```
→
```
<div className="flex flex-col gap-1.5 border-t border-border/80 p-3">
```

- [ ] **Step 2: 类型检查**

Run: `cd frontend && npx tsc -p tsconfig.json --noEmit`
Expected: 无报错。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/dashboard/NovelsPage.tsx
git commit -m "style(dashboard): 我的小说卡片收紧 + 4 列布局"
```

---

## Task 10: 全量验证

**Files:** 无（仅运行验证）

- [ ] **Step 1: 前端类型 + 单测**

Run: `cd frontend && npx tsc -p tsconfig.json --noEmit && npx vitest run`
Expected: 类型无错；所有测试通过（含更新后的 dashboardCacheStore.test.ts）。

- [ ] **Step 2: 后端单测**

Run: `cd novel-studio && ./mvnw -pl studio-modules/studio-module-billing test -Dtest=SiteDanmakuBizTest -q`
Expected: PASS。

- [ ] **Step 3: 人工冒烟（线上部署后）**

部署后访问 https://www.novel-agent.cn 验证：
1. 概览页出现 Token 消耗图（独立加载，失败不影响其余卡片）。
2. 侧边栏无「书库」「账户设置」项；左下角显示像素头像 + 用户名 + 邮箱。
3. 「我的书库」顶部有「去书库添加更多」按钮；书籍为列表行布局。
4. 「我的小说」4 列紧凑卡片。
5. 设置页评价：首次提交后显示「已评价」；刷新后仍为已评价态；二次提交被后端拒绝。
6. 概览热力图显示近 13 周，填满卡片宽度。

---

## Self-Review 结论

**Spec 覆盖**：6 个目标全部对应到 Task（Token图→T5/T6，书库导航→T8+T7，紧凑布局→T8/T9，账户设置去重+头像→T7，弹幕去重→T2/T3，热力图→T1）。✅
**占位符**：无 TBD/TODO，所有代码步骤含完整代码。✅
**类型一致**：`UsageTrendPoint`、`getTokenTrends`/`setTokenTrends`、`existsByUserId`、`feedbackAlreadySubmitted` 在定义与使用处一致。✅
