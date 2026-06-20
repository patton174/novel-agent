# 仪表盘与管理后台去 Demo 化重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把仪表盘 `/dashboard` 与管理后台 `/admin` 重构为 Editorial 风格的专业界面，沉淀一套 Pro 级组件库，桌面/手机分端独立页面。

**Architecture:** 新建 `components/pro/` 组件库（shadcn/Tailwind v4 底座 + `@tabler/icons-react` + Tabler 设计 token，不引 `@tabler/core` CSS）。桌面/手机两套独立页面组件，路由分发器按 `useAppMobile()` 选择，业务逻辑抽共享 hook。侧边栏分组（后台四组全展开 / 仪表盘仅小标题），图标选中时 SVG 笔画描边绘制动画。

**Tech Stack:** React 18 + TypeScript + Tailwind v4 + class-variance-authority + radix-ui + recharts + react-router-dom v6 + react-i18next + Vitest + @testing-library/react

**约定（全计划通用）：**
- 测试命令：`cd frontend && npm test -- <pattern>`（`npm test` = `vitest run`）
- `cn` 来自 `@/lib/utils`；`useAppMobile` 来自 `@/hooks/useMediaQuery`；移动断点 767px（`APP_MOBILE_MAX_PX`，见 `@/lib/breakpoints`）
- 现有设计 token 在 `src/styles/globals.css` 的 `@theme`：`--color-primary: #4f46e5`、`--color-background: #f8fafc`、`--color-foreground: #0f172a`、`--color-muted-foreground: #64748b`、`--color-border: #e2e8f0`、`--radius: 0.5rem`、`--shadow-soft`、`--shadow-hover`
- jsdom 测试环境已 mock `window.matchMedia`（返回 `matches:false`，见 `src/test/setup.ts`）；测试手机端需在用例内 override `window.matchMedia`
- 每个新组件 i18n key 加在 `src/i18n/locales/zh/common.json` 与 `src/i18n/locales/en/common.json`（已存在 `nav.*` 命名空间）
- 不动编辑器/Agent/登录/营销页，不删现有 `components/ui/`

---

## Phase 1 — 基础设施（token、图标、描边动画、端分发）

### Task 1: 安装 @tabler/icons-react 并接入设计 token

**Files:**
- Modify: `frontend/package.json`（加依赖）
- Modify: `frontend/src/styles/globals.css`（在 `@theme` 内补 Tabler 设计 token 映射）

- [ ] **Step 1: 安装依赖**

Run: `cd frontend && npm install @tabler/icons-react@^3.44.0`
Expected: package.json dependencies 出现 `"@tabler/icons-react": "^3.44.0"`，node_modules 安装成功

- [ ] **Step 2: 在 globals.css 的 `@theme` 块内追加 Tabler 设计 token**

在 `frontend/src/styles/globals.css` 的 `@theme { ... }` 块末尾（`--text-ui-xs` 那一行之后）追加：

```css
  /* Tabler 设计 token 映射（去 demo 化重构专用，供 pro/ 组件消费） */
  --tabler-blue: #206bc4;
  --tabler-azure: #4299e1;
  --tabler-indigo: #4263eb;
  --tabler-text-muted: #616877;
  --tabler-border-color: #e6e8eb;
  --tabler-bg-surface: #ffffff;
  --tabler-bg-surface-secondary: #f8f9fa;
  --tabler-radius: 4px;
  --tabler-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04);
```

- [ ] **Step 3: 验证图标可导入**

Run: `cd frontend && node -e "require('@tabler/icons-react'); console.log('ok')"`
Expected: 输出 `ok`，无报错

- [ ] **Step 4: 验证前端仍能构建（CSS 无语法错误）**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: 无新增错误（与改动前一致；既有错误忽略）

- [ ] **Step 5: Commit**

```bash
cd frontend && git add package.json package-lock.json src/styles/globals.css
git commit -m "feat(pro): 安装 @tabler/icons-react 并接入 Tabler 设计 token"
```

---

### Task 2: IconStroke 描边动画底层组件（TDD）

**Files:**
- Create: `frontend/src/components/pro/IconStroke.tsx`
- Create: `frontend/src/components/pro/IconStroke.test.tsx`

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/IconStroke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconHome } from '@tabler/icons-react'
import { IconStroke } from './IconStroke'

describe('IconStroke', () => {
  it('renders the wrapped icon', () => {
    render(<IconStroke icon={IconHome} label="首页" />)
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
  })

  it('applies active class when active=true', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" active />)
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.className).toContain('pro-icon-stroke--active')
  })

  it('does not apply active class when active=false', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" />)
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.className).not.toContain('pro-icon-stroke--active')
  })

  it('respects reduced motion by not animating when prefersReducedMotion=true', () => {
    const { container } = render(
      <IconStroke icon={IconHome} label="首页" active prefersReducedMotion />,
    )
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.className).toContain('pro-icon-stroke--reduced')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd frontend && npm test -- IconStroke`
Expected: FAIL — `Cannot find module './IconStroke'`

- [ ] **Step 3: 实现组件**

`frontend/src/components/pro/IconStroke.tsx`:

```tsx
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type TablerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

export interface IconStrokeProps {
  /** tabler 图标组件，如 IconHome */
  icon: TablerIcon
  /** 无障碍标签 */
  label: string
  /** 是否选中态（触发描边绘制动画） */
  active?: boolean
  /** 用户偏好减少动画（跳过绘制过渡，直接显示） */
  prefersReducedMotion?: boolean
  className?: string
  size?: number | string
}

/**
 * tabler line-icon 描边动画包裹层。
 * - 默认态：淡色（text-muted-foreground）正常显示。
 * - active 态：给 svg 内所有 path/line 设 pathLength=1、stroke-dasharray=1、
 *   stroke-dashoffset 1→0 做 ~400ms ease-out 绘制过渡，完成后常驻描边，indigo 强调。
 * 实现：靠 CSS 类 + 全局 keyframes（见 pro.css，Task 3 注入）作用于
 *   [data-icon-stroke--active] svg path/line。
 */
export function IconStroke({
  icon: Icon,
  label,
  active = false,
  prefersReducedMotion = false,
  className,
  size = 20,
}: IconStrokeProps) {
  return (
    <span
      data-icon-stroke=""
      data-active={active ? 'true' : 'false'}
      aria-label={label}
      role="img"
      className={cn(
        'inline-flex items-center justify-center',
        active && 'pro-icon-stroke--active',
        prefersReducedMotion && 'pro-icon-stroke--reduced',
        className,
      )}
    >
      <Icon
        size={size}
        stroke={1.5}
        aria-hidden="true"
        focusable="false"
      />
    </span>
  )
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd frontend && npm test -- IconStroke`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/IconStroke.tsx src/components/pro/IconStroke.test.tsx
git commit -m "feat(pro): IconStroke 描边动画底层组件"
```

---

### Task 3: pro.css 描边动画全局样式 + prefers-reduced-motion 守护

**Files:**
- Create: `frontend/src/styles/pro.css`
- Modify: `frontend/src/styles/globals.css`（导入 pro.css）

- [ ] **Step 1: 创建 pro.css**

`frontend/src/styles/pro.css`:

```css
/* Pro 组件专用样式：图标描边动画等。Editorial 基调，基于现有 @theme token。 */

/* 让 tabler svg 内的 path/line 可被 dasharray 控制 */
.pro-icon-stroke--active svg path,
.pro-icon-stroke--active svg line {
  pathLength: 1;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: pro-icon-draw 420ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
  stroke: var(--color-primary);
}

@keyframes pro-icon-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* active 后常驻：保持 indigo 描边色（动画 forwards 已 hold 住 dashoffset:0） */
.pro-icon-stroke--active svg path,
.pro-icon-stroke--active svg line {
  stroke: var(--color-primary);
}

/* 未选中态淡色 */
[data-icon-stroke]:not(.pro-icon-stroke--active) svg path,
[data-icon-stroke]:not(.pro-icon-stroke--active) svg line {
  stroke: currentColor;
}

/* prefers-reduced-motion：跳过绘制，直接显示 */
.pro-icon-stroke--reduced.pro-icon-stroke--active svg path,
.pro-icon-stroke--reduced.pro-icon-stroke--active svg line {
  animation: none;
  stroke-dashoffset: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pro-icon-stroke--active svg path,
  .pro-icon-stroke--active svg line {
    animation: none;
    stroke-dashoffset: 0;
  }
}
```

- [ ] **Step 2: 在 globals.css 顶部导入块追加 pro.css**

在 `frontend/src/styles/globals.css` 第 9 行（`@import "shadcn/tailwind.css";` 之后、`@import "@fontsource-variable/geist";` 之前）插入一行：

```css
@import "./pro.css";
```

- [ ] **Step 3: 验证 CSS 无语法错误（构建）**

Run: `cd frontend && npx vite build --logLevel error 2>&1 | tail -5`
Expected: 构建成功无 CSS 错误（若耗时过长可改用 `npx tsc --noEmit` 仅校验）

- [ ] **Step 4: 重跑 IconStroke 测试确认未被破坏**

Run: `cd frontend && npm test -- IconStroke`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/styles/pro.css src/styles/globals.css
git commit -m "feat(pro): 描边动画全局样式 pro.css + reduced-motion 守护"
```

---

## Phase 2 — Pro 组件库（基础原子）

### Task 4: ProButton（CVA 多变体按钮，TDD）

**Files:**
- Create: `frontend/src/components/pro/ProButton.tsx`
- Create: `frontend/src/components/pro/ProButton.test.tsx`

参考现有 `src/components/ui/button.tsx` 的 CVA 模式，但 Editorial 风格：默认 `rounded-xl`、indigo primary、细分隔 hover。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/ProButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProButton } from './ProButton'

describe('ProButton', () => {
  it('renders children', () => {
    render(<ProButton>保存</ProButton>)
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('applies primary variant classes by default', () => {
    render(<ProButton>保存</ProButton>)
    expect(screen.getByRole('button', { name: '保存' }).className).toContain('pro-btn--primary')
  })

  it('applies ghost variant', () => {
    render(<ProButton variant="ghost">取消</ProButton>)
    expect(screen.getByRole('button', { name: '取消' }).className).toContain('pro-btn--ghost')
  })

  it('applies danger variant', () => {
    render(<ProButton variant="danger">删除</ProButton>)
    expect(screen.getByRole('button', { name: '删除' }).className).toContain('pro-btn--danger')
  })

  it('shows loading state and disables', () => {
    render(<ProButton loading>提交</ProButton>)
    const btn = screen.getByRole('button', { name: '提交' })
    expect(btn).toBeDisabled()
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })

  it('forwards ref', () => {
    let ref: HTMLButtonElement | null = null
    render(<ProButton ref={(el) => { ref = el }}>x</ProButton>)
    expect(ref).not.toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProButton`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/ProButton.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const proButtonVariants = cva('pro-btn inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0', {
  variants: {
    variant: {
      primary: 'pro-btn--primary bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft',
      secondary: 'pro-btn--secondary bg-surface border border-border text-foreground hover:bg-muted',
      ghost: 'pro-btn--ghost text-muted-foreground hover:bg-muted hover:text-foreground',
      subtle: 'pro-btn--subtle bg-muted text-foreground hover:bg-muted/70',
      danger: 'pro-btn--danger bg-destructive/10 text-destructive hover:bg-destructive/20',
      link: 'pro-btn--link text-primary underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-8 px-3 text-[0.8rem]',
      md: 'h-9 px-4',
      lg: 'h-10 px-5 text-[0.95rem]',
      icon: 'size-9 p-0',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

export interface ProButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof proButtonVariants> {
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const ProButton = forwardRef<HTMLButtonElement, ProButtonProps>(function ProButton(
  { className, variant, size, loading = false, leftIcon, rightIcon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(proButtonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : leftIcon}
      {children}
      {!loading ? rightIcon : null}
    </button>
  )
})
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- ProButton`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/ProButton.tsx src/components/pro/ProButton.test.tsx
git commit -m "feat(pro): ProButton CVA 多变体按钮"
```

---

### Task 5: ProChartKpi（Editorial 大数值 KPI 卡，TDD）

**Files:**
- Create: `frontend/src/components/pro/ProChartKpi.tsx`
- Create: `frontend/src/components/pro/ProChartKpi.test.tsx`

延续现有 `DashboardKpiCard`（`rounded-2xl border-border/70 bg-surface shadow-soft`、`text-[2rem] font-bold tabular-nums`），加趋势箭头与可选 sparkline。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/ProChartKpi.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProChartKpi } from './ProChartKpi'

describe('ProChartKpi', () => {
  it('renders label and value', () => {
    render(<ProChartKpi label="Token 消耗" value="1,284,930" />)
    expect(screen.getByText('1,284,930')).toBeInTheDocument()
    expect(screen.getByText('Token 消耗')).toBeInTheDocument()
  })

  it('renders up trend with positive delta', () => {
    render(<ProChartKpi label="x" value="1" trend={{ delta: 12.4, direction: 'up' }} />)
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument()
    expect(screen.getByText(/12\.4%/).className).toContain('text-success')
  })

  it('renders down trend with negative styling', () => {
    render(<ProChartKpi label="x" value="1" trend={{ delta: -3.1, direction: 'down' }} />)
    expect(screen.getByText(/-3\.1%/)).toBeInTheDocument()
  })

  it('shows skeleton when loading', () => {
    const { container } = render(<ProChartKpi label="x" value="" loading />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProChartKpi`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/ProChartKpi.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'

export interface ProChartKpiTrend {
  delta: number
  direction: 'up' | 'down' | 'flat'
}

export interface ProChartKpiProps {
  label: string
  value: string
  trend?: ProChartKpiTrend
  loading?: boolean
  className?: string
}

export function ProChartKpi({ label, value, trend, loading, className }: ProChartKpiProps) {
  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border/70 bg-surface px-6 py-5 shadow-soft', className)}>
        <div className="animate-pulse h-9 w-28 rounded bg-muted" />
        <div className="animate-pulse mt-3 h-4 w-20 rounded bg-muted" />
      </div>
    )
  }
  const trendColor =
    trend?.direction === 'up' ? 'text-success' : trend?.direction === 'down' ? 'text-destructive' : 'text-muted-foreground'
  const TrendIcon = trend?.direction === 'down' ? IconTrendingDown : IconTrendingUp
  return (
    <div className={cn('rounded-2xl border border-border/70 bg-surface px-6 py-5 shadow-soft', className)}>
      <p className="text-[1.75rem] font-bold tabular-nums leading-none tracking-tight text-foreground md:text-[2rem]">{value}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {trend ? (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', trendColor)}>
            <TrendIcon size={14} stroke={2} />
            {trend.delta > 0 ? '+' : ''}{trend.delta}%
          </span>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- ProChartKpi`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/ProChartKpi.tsx src/components/pro/ProChartKpi.test.tsx
git commit -m "feat(pro): ProChartKpi Editorial 大数值 KPI 卡"
```

---

### Task 6: ProChart Area/Sparkline 封装（recharts，TDD）

**Files:**
- Create: `frontend/src/components/pro/charts/ProAreaChart.tsx`
- Create: `frontend/src/components/pro/charts/ProSparkline.tsx`
- Create: `frontend/src/components/pro/charts/ProAreaChart.test.tsx`

沿用现有 `DashboardTokenUsageChart.tsx` 的 recharts + indigo 渐变模式，统一封装。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/charts/ProAreaChart.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProAreaChart } from './ProAreaChart'

describe('ProAreaChart', () => {
  it('renders without throwing', () => {
    const { container } = render(
      <ProAreaChart data={[{ x: '1', y: 10 }, { x: '2', y: 20 }]} valueKey="y" xKey="x" />,
    )
    expect(container.firstChild).not.toBeNull()
  })

  it('renders empty state when data is empty', () => {
    const { getByText } = render(<ProAreaChart data={[]} valueKey="y" xKey="x" emptyText="暂无数据" />)
    expect(getByText('暂无数据')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProAreaChart`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 ProAreaChart**

`frontend/src/components/pro/charts/ProAreaChart.tsx`:

```tsx
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface ProAreaChartProps {
  data: Array<Record<string, string | number>>
  xKey: string
  valueKey: string
  height?: number
  emptyText?: string
  formatValue?: (v: number) => string
}

export function ProAreaChart({ data, xKey, valueKey, height = 220, emptyText = '暂无数据', formatValue }: ProAreaChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {emptyText}
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="proAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
          <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
            formatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
          />
          <Area type="monotone" dataKey={valueKey} stroke="var(--color-primary)" strokeWidth={2} fill="url(#proAreaFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: 实现 ProSparkline（纯展示，复用同模式）**

`frontend/src/components/pro/charts/ProSparkline.tsx`:

```tsx
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

export interface ProSparklineProps {
  data: Array<Record<string, number>>
  valueKey: string
  height?: number
  color?: string
}

export function ProSparkline({ data, valueKey, height = 32, color = 'var(--color-primary)' }: ProSparklineProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id="proSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={valueKey} stroke={color} strokeWidth={1.5} fill="url(#proSparkFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: 运行确认通过**

Run: `cd frontend && npm test -- ProAreaChart`
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/pro/charts/
git commit -m "feat(pro): ProAreaChart / ProSparkline recharts 封装"
```

---

## Phase 3 — Pro 组件库（数据与导航原子）

### Task 7: ProTable（列定义驱动表格，TDD）

**Files:**
- Create: `frontend/src/components/pro/ProTable.tsx`
- Create: `frontend/src/components/pro/ProTable.test.tsx`

列定义驱动，复用现有 `ui/table.tsx` 原语，Editorial 细分隔线（`border-border/60`），空态/骨架/行 hover。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/ProTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProTable, type ProColumn } from './ProTable'

interface Row { id: number; name: string; status: string }

const columns: ProColumn<Row>[] = [
  { key: 'name', header: '名称', render: (r) => r.name },
  { key: 'status', header: '状态', render: (r) => r.status },
]

describe('ProTable', () => {
  it('renders headers and rows', () => {
    render(<ProTable columns={columns} data={[{ id: 1, name: '张三', status: '活跃' }]} rowKey="id" />)
    expect(screen.getByText('名称')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
  })

  it('renders empty state when data empty', () => {
    render(<ProTable columns={columns} data={[]} rowKey="id" emptyText="暂无数据" />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('renders skeleton rows when loading', () => {
    const { container } = render(<ProTable columns={columns} data={[]} rowKey="id" loading skeletonRows={3} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProTable`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/ProTable.tsx`:

```tsx
import { type ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface ProColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export interface ProTableProps<T> {
  columns: ProColumn<T>[]
  data: T[]
  rowKey: keyof T | ((row: T) => string | number)
  loading?: boolean
  skeletonRows?: number
  emptyText?: string
  onRowClick?: (row: T) => void
  className?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

export function ProTable<T>({ columns, data, rowKey, loading, skeletonRows = 5, emptyText = '暂无数据', onRowClick, className }: ProTableProps<T>) {
  const getKey = (row: T, i: number) => (typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey as keyof T] ?? i))
  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-border/60 bg-surface', className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', alignClass[c.align ?? 'left'], c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="border-border/60">
                {columns.map((c) => (
                  <TableCell key={c.key} className={alignClass[c.align ?? 'left']}>
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={getKey(row, i)} className={cn('border-border/60', onRowClick && 'cursor-pointer')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn('text-sm text-foreground', alignClass[c.align ?? 'left'], c.className)}>
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- ProTable`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/ProTable.tsx src/components/pro/ProTable.test.tsx
git commit -m "feat(pro): ProTable 列定义驱动表格"
```

---

### Task 8: ProPagination（分页，TDD）

**Files:**
- Create: `frontend/src/components/pro/ProPagination.tsx`
- Create: `frontend/src/components/pro/ProPagination.test.tsx`

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/ProPagination.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProPagination } from './ProPagination'

describe('ProPagination', () => {
  it('shows total and range', () => {
    render(<ProPagination page={1} pageSize={10} total={35} onPageChange={() => {}} />)
    expect(screen.getByText(/1-10/)).toBeInTheDocument()
    expect(screen.getByText(/\/\s*35/)).toBeInTheDocument()
  })

  it('calls onPageChange with next page', () => {
    const onChange = vi.fn()
    render(<ProPagination page={1} pageSize={10} total={35} onPageChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('disables prev on first page', () => {
    render(<ProPagination page={1} pageSize={10} total={35} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<ProPagination page={4} pageSize={10} total={35} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProPagination`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/ProPagination.tsx`:

```tsx
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export interface ProPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function ProPagination({ page, pageSize, total, onPageChange, className }: ProPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages
  return (
    <div className={cn('flex items-center justify-between gap-4 px-1 py-3 text-sm text-muted-foreground', className)}>
      <span className="tabular-nums">{start}-{end} / {total}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="上一页"
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
          className={cn('inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40')}
        >
          <IconChevronLeft size={16} stroke={2} />
        </button>
        <span className="min-w-[3rem] text-center tabular-nums text-foreground">{page} / {totalPages}</span>
        <button
          type="button"
          aria-label="下一页"
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
          className={cn('inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40')}
        >
          <IconChevronRight size={16} stroke={2} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- ProPagination`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/ProPagination.tsx src/components/pro/ProPagination.test.tsx
git commit -m "feat(pro): ProPagination 分页"
```

---

### Task 9: ProBreadcrumb + ProTabs + ProSelect + ProNavTabs + ProFooter

**Files:**
- Create: `frontend/src/components/pro/ProBreadcrumb.tsx`
- Create: `frontend/src/components/pro/ProTabs.tsx`
- Create: `frontend/src/components/pro/ProSelect.tsx`
- Create: `frontend/src/components/pro/ProNavTabs.tsx`
- Create: `frontend/src/components/pro/ProFooter.tsx`
- Create: `frontend/src/components/pro/ProTabs.test.tsx`

这五个组件偏展示型，合并一个 task；仅 ProTabs 带交互测试。ProSelect 复用 radix `DropdownMenu`（项目已用 `ui/dropdown-menu.tsx`）。

- [ ] **Step 1: 写 ProTabs 失败测试**

`frontend/src/components/pro/ProTabs.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProTabs } from './ProTabs'

describe('ProTabs', () => {
  it('renders first tab content by default', () => {
    render(
      <ProTabs
        tabs={[{ key: 'a', label: 'A', content: <div>内容A</div> }, { key: 'b', label: 'B', content: <div>内容B</div> }]}
      />,
    )
    expect(screen.getByText('内容A')).toBeInTheDocument()
  })

  it('switches content on tab click', () => {
    render(
      <ProTabs
        tabs={[{ key: 'a', label: 'A', content: <div>内容A</div> }, { key: 'b', label: 'B', content: <div>内容B</div> }]}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'B' }))
    expect(screen.getByText('内容B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProTabs`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 ProBreadcrumb**

`frontend/src/components/pro/ProBreadcrumb.tsx`:

```tsx
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface ProBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function ProBreadcrumb({ items, className }: ProBreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <Fragment key={i}>
            {item.to && !last ? (
              <Link to={item.to} className="transition-colors hover:text-foreground">{item.label}</Link>
            ) : (
              <span className={cn(last && 'text-foreground font-medium')}>{item.label}</span>
            )}
            {!last ? <IconChevronRight size={14} stroke={2} className="text-muted-foreground/60" /> : null}
          </Fragment>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: 实现 ProTabs**

`frontend/src/components/pro/ProTabs.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ProTabItem {
  key: string
  label: ReactNode
  content: ReactNode
}

export interface ProTabsProps {
  tabs: ProTabItem[]
  defaultActiveKey?: string
  className?: string
}

export function ProTabs({ tabs, defaultActiveKey, className }: ProTabsProps) {
  const [active, setActive] = useState(defaultActiveKey ?? tabs[0]?.key)
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0]
  return (
    <div className={className}>
      <div role="tablist" className="flex gap-6 border-b border-border/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={cn(
              '-mb-px border-b-2 px-1 pb-3 pt-2 text-sm font-medium transition-colors',
              t.key === active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  )
}
```

- [ ] **Step 5: 实现 ProSelect**

`frontend/src/components/pro/ProSelect.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { IconChevronDown, IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export interface ProSelectOption {
  value: string
  label: ReactNode
}

export interface ProSelectProps {
  value: string
  options: ProSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ProSelect({ value, options, onChange, placeholder = '请选择', className }: ProSelectProps) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 min-w-[8rem] items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface px-3 text-sm text-foreground transition-colors hover:bg-muted',
            className,
          )}
        >
          <span className={cn(!current && 'text-muted-foreground')}>{current?.label ?? placeholder}</span>
          <IconChevronDown size={16} stroke={2} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[8rem]">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} className="gap-2">
            <IconCheck size={14} stroke={2} className={cn(o.value === value ? 'opacity-100 text-primary' : 'opacity-0')} />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 6: 实现 ProNavTabs（顶部多标签页，可关闭）**

`frontend/src/components/pro/ProNavTabs.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom'
import { IconX } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export interface NavTabItem {
  to: string
  label: string
}

export interface ProNavTabsProps {
  tabs: NavTabItem[]
  onClose?: (to: string) => void
  className?: string
}

export function ProNavTabs({ tabs, onClose, className }: ProNavTabsProps) {
  const { pathname } = useLocation()
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-border/60 px-2', className)}>
      {tabs.map((t) => {
        const active = pathname === t.to
        return (
          <div
            key={t.to}
            className={cn(
              'group flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Link to={t.to} className="whitespace-nowrap">{t.label}</Link>
            {onClose ? (
              <button type="button" aria-label={`关闭 ${t.label}`} onClick={() => onClose(t.to)} className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                <IconX size={13} stroke={2} />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: 实现 ProFooter**

`frontend/src/components/pro/ProFooter.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface ProFooterLink {
  label: string
  to: string
}

export interface ProFooterProps {
  links?: ProFooterLink[]
  copyright?: string
  className?: string
}

export function ProFooter({ links = [], copyright = '© 2026 Novel Studio', className }: ProFooterProps) {
  return (
    <footer className={cn('border-t border-border/60 px-6 py-4', className)}>
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <span>{copyright}</span>
        <nav className="flex gap-4">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="transition-colors hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
```

- [ ] **Step 8: 运行 ProTabs 测试确认通过**

Run: `cd frontend && npm test -- ProTabs`
Expected: 2 tests PASS

- [ ] **Step 9: 全量 tsc 校验这批新组件**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "pro/(ProBreadcrumb|ProTabs|ProSelect|ProNavTabs|ProFooter)" | head`
Expected: 无输出（无类型错误）

- [ ] **Step 10: Commit**

```bash
cd frontend && git add src/components/pro/ProBreadcrumb.tsx src/components/pro/ProTabs.tsx src/components/pro/ProSelect.tsx src/components/pro/ProNavTabs.tsx src/components/pro/ProFooter.tsx src/components/pro/ProTabs.test.tsx
git commit -m "feat(pro): ProBreadcrumb / ProTabs / ProSelect / ProNavTabs / ProFooter"
```

---

## Phase 4 — 布局组件（侧边栏分组 + 手机 TabBar）

### Task 10: 补充 Pro 导航 i18n key

**Files:**
- Modify: `frontend/src/i18n/locales/zh/common.json`
- Modify: `frontend/src/i18n/locales/en/common.json`

为新侧栏分组小标题与手机 tabbar 标签加 key。在 `common.json` 的 `"nav"` 对象内追加（与现有 `adminOverview` 等同级）。

- [ ] **Step 1: 在 zh/common.json 的 nav 对象内追加**

在 `frontend/src/i18n/locales/zh/common.json` 的 `"nav"` 节点内追加这些键（紧接现有 nav 键之后，闭合 `}` 之前）：

```json
    "groupOverview": "概览",
    "groupOperations": "运营",
    "groupContent": "内容",
    "groupSystem": "系统",
    "groupCreation": "创作",
    "groupAccount": "账户",
    "tabHome": "概览",
    "tabNovels": "小说",
    "tabLibrary": "书库",
    "tabMine": "我的",
```

- [ ] **Step 2: 在 en/common.json 的 nav 对象内追加对应英文**

在 `frontend/src/i18n/locales/en/common.json` 的 `"nav"` 节点内追加：

```json
    "groupOverview": "Overview",
    "groupOperations": "Operations",
    "groupContent": "Content",
    "groupSystem": "System",
    "groupCreation": "Writing",
    "groupAccount": "Account",
    "tabHome": "Home",
    "tabNovels": "Novels",
    "tabLibrary": "Library",
    "tabMine": "Me",
```

- [ ] **Step 3: 校验 JSON 合法**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/zh/common.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en/common.json','utf8')); console.log('json ok')"`
Expected: 输出 `json ok`

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/i18n/locales/zh/common.json src/i18n/locales/en/common.json
git commit -m "feat(pro): 补充 Pro 导航分组与手机 tabbar i18n key"
```

---

### Task 11: ProSidebar（分组 + 描边动画选中态，TDD）

**Files:**
- Create: `frontend/src/components/pro/ProSidebar.tsx`
- Create: `frontend/src/components/pro/ProSidebar.test.tsx`

分组侧边栏：接收 `groups: { title?: string; items: NavItem[] }[]`，每项用 `IconStroke`（active 时描边动画）。复用 tabler 图标。桌面常驻模式（embedded 控制外框）。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/ProSidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IconHome, IconBook } from '@tabler/icons-react'
import { ProSidebar, type ProSidebarGroup } from './ProSidebar'

const groups: ProSidebarGroup[] = [
  { title: '概览', items: [{ label: '首页', to: '/', icon: IconHome, end: true }] },
  { title: '创作', items: [{ label: '小说', to: '/novels', icon: IconBook }] },
]

describe('ProSidebar', () => {
  it('renders group titles', () => {
    render(<MemoryRouter><ProSidebar groups={groups} /></MemoryRouter>)
    expect(screen.getByText('概览')).toBeInTheDocument()
    expect(screen.getByText('创作')).toBeInTheDocument()
  })

  it('renders item labels as links', () => {
    render(<MemoryRouter><ProSidebar groups={groups} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '小说' })).toHaveAttribute('href', '/novels')
  })

  it('renders group without title when title omitted', () => {
    render(<MemoryRouter><ProSidebar groups={[{ items: [{ label: '首页', to: '/', icon: IconHome, end: true }] }]} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '首页' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProSidebar`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/ProSidebar.tsx`:

```tsx
import { type ComponentType, type SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { IconStroke } from './IconStroke'
import { cn } from '@/lib/utils'

type TablerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

export interface ProSidebarItem {
  label: string
  to: string
  icon: TablerIcon
  end?: boolean
}

export interface ProSidebarGroup {
  title?: string
  items: ProSidebarItem[]
}

export interface ProSidebarProps {
  groups: ProSidebarGroup[]
  embedded?: boolean
  onNavigate?: () => void
  className?: string
}

export function ProSidebar({ groups, embedded = false, onNavigate, className }: ProSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-background text-foreground',
        embedded ? 'w-full' : 'w-56 shrink-0 border-r border-border/60',
        className,
      )}
    >
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {g.title ? (
              <p className="px-3 pb-1 pt-2 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground/70">{g.title}</p>
            ) : null}
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <IconStroke icon={item.icon} label={item.label} active={isActive} size={20} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- ProSidebar`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/ProSidebar.tsx src/components/pro/ProSidebar.test.tsx
git commit -m "feat(pro): ProSidebar 分组侧边栏 + 描边动画选中态"
```

---

### Task 12: ProTabBar（手机底部导航，TDD）

**Files:**
- Create: `frontend/src/components/pro/ProTabBar.tsx`
- Create: `frontend/src/components/pro/ProTabBar.test.tsx`

手机端底部 4 项导航，复用 `IconStroke`，仅 `md:hidden`。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/ProTabBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IconHome, IconBook, IconBooks, IconUser } from '@tabler/icons-react'
import { ProTabBar } from './ProTabBar'

const items = [
  { label: '概览', to: '/', icon: IconHome, end: true },
  { label: '小说', to: '/novels', icon: IconBook },
  { label: '书库', to: '/library', icon: IconBooks },
  { label: '我的', to: '/me', icon: IconUser },
]

describe('ProTabBar', () => {
  it('renders 4 tab links', () => {
    render(<MemoryRouter><ProTabBar items={items} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '概览' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我的' })).toBeInTheDocument()
  })

  it('has md:hidden class to stay mobile-only', () => {
    const { container } = render(<MemoryRouter><ProTabBar items={items} /></MemoryRouter>)
    expect(container.firstChild).not.toBeNull()
    expect((container.firstChild as HTMLElement).className).toContain('md:hidden')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- ProTabBar`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/ProTabBar.tsx`:

```tsx
import { type ComponentType, type SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { IconStroke } from './IconStroke'
import { cn } from '@/lib/utils'

type TablerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

export interface ProTabBarItem {
  label: string
  to: string
  icon: TablerIcon
  end?: boolean
}

export interface ProTabBarProps {
  items: ProTabBarItem[]
  className?: string
}

export function ProTabBar({ items, className }: ProTabBarProps) {
  return (
    <nav className={cn('fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/60 bg-surface/95 backdrop-blur md:hidden', className)} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[0.68rem] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <IconStroke icon={item.icon} label={item.label} active={isActive} size={22} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- ProTabBar`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/ProTabBar.tsx src/components/pro/ProTabBar.test.tsx
git commit -m "feat(pro): ProTabBar 手机底部导航"
```

---

## Phase 5 — 端分发基础设施 + 布局接入

### Task 13: useIsDesktop 端分发 hook + 页面分发器约定（TDD）

**Files:**
- Create: `frontend/src/components/pro/useIsDesktop.ts`
- Create: `frontend/src/components/pro/useIsDesktop.test.ts`

封装 `!useAppMobile()` 为语义化 hook，供分发器使用。分发器模式（`XxxPage.tsx` 用 `<DesktopView/>` 或 `<MobileView/>`）在各页面 task 内体现，本 task 只提供 hook。

- [ ] **Step 1: 写失败测试**

`frontend/src/components/pro/useIsDesktop.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIsDesktop } from './useIsDesktop'

describe('useIsDesktop', () => {
  it('returns true when matchMedia says desktop (matches:false for mobile query)', () => {
    // setup.ts 默认 mock matchMedia 返回 matches:false，即「非移动」= 桌面
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia matches mobile query', () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q.includes('max-width'), media: q, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })) as any
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
    window.matchMedia = original
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd frontend && npm test -- useIsDesktop`
Expected: FAIL — module not found

- [ ] **Step 3: 实现**

`frontend/src/components/pro/useIsDesktop.ts`:

```ts
import { useAppMobile } from '@/hooks/useMediaQuery'

/** 是否桌面端（≥768px）。语义化封装，供页面分发器使用。 */
export function useIsDesktop(): boolean {
  return !useAppMobile()
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd frontend && npm test -- useIsDesktop`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/pro/useIsDesktop.ts src/components/pro/useIsDesktop.test.tsx
git commit -m "feat(pro): useIsDesktop 端分发 hook"
```

---

### Task 14: 仪表盘布局接入 ProSidebar（桌面）+ ProTabBar（手机）

**Files:**
- Modify: `frontend/src/layouts/DashboardLayout.tsx`
- Modify: `frontend/src/components/dashboard/AppSidebar.tsx`（改为基于 ProSidebar 的薄封装，或直接在布局内构造 groups）

仪表盘项少不分组、仅加小标题。把现有 `AppSidebar` 的平铺改为 ProSidebar 的单组（无 title 或带 `groupCreation` 小标题），桌面 `md:block`，手机用 ProTabBar 底部 4 项。保留现有 header/announcement/quick actions/profile fetch 逻辑。

- [ ] **Step 1: 改造 AppSidebar 为 ProSidebar 薄封装**

把 `frontend/src/components/dashboard/AppSidebar.tsx` 的 `mainNav` 与渲染体替换为基于 `ProSidebar`。新文件内容：

```tsx
import { useTranslation } from 'react-i18next'
import { IconLayoutDashboard, IconBook2, IconBooks, IconCreditCard } from '@tabler/icons-react'
import { ProSidebar, type ProSidebarGroup } from '@/components/pro/ProSidebar'

export function AppSidebar({ embedded = false, onNavigate }: { embedded?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation(['common'])
  const groups: ProSidebarGroup[] = [
    {
      title: t('common:nav.groupCreation'),
      items: [
        { label: t('common:nav.dashboardOverview'), to: '/dashboard', icon: IconLayoutDashboard, end: true },
        { label: t('common:nav.dashboardNovels'), to: '/dashboard/novels', icon: IconBook2 },
        { label: t('common:nav.dashboardMyLibrary'), to: '/dashboard/my-library', icon: IconBooks },
        { label: t('common:nav.dashboardBilling'), to: '/dashboard/billing', icon: IconCreditCard },
      ],
    },
  ]
  return <ProSidebar groups={groups} embedded={embedded} onNavigate={onNavigate} />
}
```

注：原 AppSidebar 底部的设置入口 + 头像区由布局层（Task 15）承接，本组件不再含。

- [ ] **Step 2: 改造 DashboardLayout，加 ProTabBar 与手机端 padding**

把 `frontend/src/layouts/DashboardLayout.tsx` 的返回体替换为：

```tsx
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={meta.title}
          description={meta.description}
          leading={<MobileSidebarDrawer />}
          actions={<DashboardQuickActions />}
        />
        <DashboardAnnouncementBanner />
        <AppShellMain className="pb-16 md:pb-0">
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </AppShellMain>
      </div>
      <ProTabBar
        items={[
          { label: t('common:nav.tabHome'), to: '/dashboard', icon: IconLayoutDashboard, end: true },
          { label: t('common:nav.tabNovels'), to: '/dashboard/novels', icon: IconBook2 },
          { label: t('common:nav.tabLibrary'), to: '/dashboard/my-library', icon: IconBooks },
          { label: t('common:nav.tabMine'), to: '/dashboard/settings', icon: IconUser },
        ]}
      />
    </div>
  )
```

并在文件顶部 import 区追加：

```tsx
import { IconLayoutDashboard, IconBook2, IconBooks, IconUser } from '@tabler/icons-react'
import { ProTabBar } from '@/components/pro/ProTabBar'
```

注：`AppShellMain` 需接受 `className`；若现有签名不支持，改为在外层包 `<div className="pb-16 md:pb-0">`。先查 `AppShellMain` 签名再定：`grep -n "className" src/components/layout/AppShellMain.tsx`。

- [ ] **Step 3: 处理 AppShellMain className 兼容**

Run: `cd frontend && grep -n "className" src/components/layout/AppShellMain.tsx`
若 AppShellMain 已接受 `className`，跳过；否则在其 props 加 `className?: string` 并 `cn(...)` 合并到根 div。

- [ ] **Step 4: 校验类型**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "DashboardLayout|AppSidebar" | head`
Expected: 无输出

- [ ] **Step 5: 跑现有仪表盘相关测试确认未破坏**

Run: `cd frontend && npm test -- MobileSidebarDrawer NovelsPage 2>&1 | tail -15`
Expected: 现有用例 PASS（MobileSidebarDrawer 仍渲染 md:hidden 触发器；若 AppSidebar 测试因结构变更失败，按失败信息更新该测试断言为「渲染 4 个链接」）

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/layouts/DashboardLayout.tsx src/components/dashboard/AppSidebar.tsx src/components/layout/AppShellMain.tsx
git commit -m "feat(dashboard): 布局接入 ProSidebar + ProTabBar（桌面侧栏/手机底部 tabbar）"
```

---

### Task 15: 仪表盘侧栏底部头像区 + 设置入口（桌面）

**Files:**
- Create: `frontend/src/components/dashboard/DashboardSidebarFooter.tsx`
- Modify: `frontend/src/layouts/DashboardLayout.tsx`

原 AppSidebar 底部有头像 + 设置入口，Task 14 把它移出。这里新建独立 footer 组件并插入桌面侧栏底部。复用现有 `UserPixelAvatar` + `PixelAvatarFrame`（仪表盘样式优化已建立）。

- [ ] **Step 1: 新建 DashboardSidebarFooter**

`frontend/src/components/dashboard/DashboardSidebarFooter.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconSettings } from '@tabler/icons-react'
import { UserPixelAvatar } from '@/components/avatars/UserPixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'
import { useUserStore } from '@/stores/userStore'
import { cn } from '@/lib/utils'

export function DashboardSidebarFooter() {
  const { t } = useTranslation(['common'])
  const profile = useUserStore((s) => s.profile)
  return (
    <div className="border-t border-border/60 p-3">
      <NavLink
        to="/dashboard/settings"
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-xl px-2 py-2 transition-colors',
            isActive ? 'bg-primary/5' : 'hover:bg-muted',
          )
        }
      >
        {profile ? (
          <PixelAvatarFrame size={32}>
            <UserPixelAvatar userId={profile.userId} size={32} />
          </PixelAvatarFrame>
        ) : (
          <div className="size-8 rounded-lg bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{profile?.username ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{profile?.email ?? ''}</p>
        </div>
        <IconSettings size={18} stroke={1.5} className="text-muted-foreground" />
      </NavLink>
    </div>
  )
}
```

注：`UserPixelAvatar`/`PixelAvatarFrame` 的实际导出名与 props 以仓库现存为准；实现前先 `grep -rn "export.*PixelAvatarFrame\|export.*UserPixelAvatar" src/components/avatars` 核对，按真实签名调整 import 与 size prop。

- [ ] **Step 2: 核对头像组件真实导出**

Run: `cd frontend && grep -rn "export" src/components/avatars/UserPixelAvatar.tsx src/components/avatars/PixelAvatarFrame.tsx | head`
按真实导出修正 Task 15 Step 1 的 import。

- [ ] **Step 3: 让 ProSidebar 支持底部 footer 插槽**

修改 `frontend/src/components/pro/ProSidebar.tsx`：在 `ProSidebarProps` 加 `footer?: ReactNode`，并在 `</nav>` 之后渲染：

```tsx
      </nav>
      {footer}
    </aside>
```

（import 顶部加 `import { type ComponentType, type ReactNode, type SVGProps } from 'react'`）

- [ ] **Step 4: 在 DashboardLayout 把 footer 传给 AppSidebar**

修改 `AppSidebar`（Task 14 版本）接受 `footer` 并透传给 `ProSidebar`；在 `DashboardLayout` 桌面侧栏处：

```tsx
<AppSidebar footer={<DashboardSidebarFooter />} />
```

并在 DashboardLayout 顶部 import `DashboardSidebarFooter`。

- [ ] **Step 5: 校验类型**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "Sidebar|DashboardLayout" | head`
Expected: 无输出

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/dashboard/DashboardSidebarFooter.tsx src/components/pro/ProSidebar.tsx src/components/dashboard/AppSidebar.tsx src/layouts/DashboardLayout.tsx
git commit -m "feat(dashboard): 桌面侧栏底部头像区 + 设置入口"
```

---

## Phase 6 — 管理后台布局

### Task 16: AdminSidebar 改为 ProSidebar 四分组

**Files:**
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`

后台 10 项按四分组：概览（概览/统计）、运营（用户/套餐/收入/站点内容）、内容（爬虫/目录）、系统（审计日志/系统设置）。全展开带小标题，不折叠。图标切 tabler。

- [ ] **Step 1: 重写 AdminSidebar 为 ProSidebar 薄封装**

`frontend/src/components/admin/AdminSidebar.tsx` 新内容：

```tsx
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { IconLayoutDashboard, IconUsers, IconCreditCard, IconCoin, IconFileText, IconRobot, IconBook2, IconHistory, IconAdjustments, IconChartBar, IconArrowLeft, IconShield } from '@tabler/icons-react'
import { ProSidebar, type ProSidebarGroup } from '@/components/pro/ProSidebar'

export function AdminSidebar({ embedded = false, onNavigate }: { embedded?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation(['common'])
  const groups: ProSidebarGroup[] = [
    {
      title: t('common:nav.groupOverview'),
      items: [
        { label: t('common:nav.adminOverview'), to: '/admin', icon: IconLayoutDashboard, end: true },
        { label: t('common:nav.adminStats'), to: '/admin/stats', icon: IconChartBar },
      ],
    },
    {
      title: t('common:nav.groupOperations'),
      items: [
        { label: t('common:nav.adminUsers'), to: '/admin/users', icon: IconUsers },
        { label: t('common:nav.adminPlans'), to: '/admin/plans', icon: IconCreditCard },
        { label: t('common:nav.adminRevenue'), to: '/admin/revenue', icon: IconCoin },
        { label: t('common:nav.adminSiteContent'), to: '/admin/site-content', icon: IconFileText },
      ],
    },
    {
      title: t('common:nav.groupContent'),
      items: [
        { label: t('common:nav.adminCrawler'), to: '/admin/crawler', icon: IconRobot },
        { label: t('common:nav.adminCatalog'), to: '/admin/catalog', icon: IconBook2 },
      ],
    },
    {
      title: t('common:nav.groupSystem'),
      items: [
        { label: t('common:nav.adminAuditLog'), to: '/admin/audit-log', icon: IconHistory },
        { label: t('common:nav.adminSystemSettings'), to: '/admin/system-settings', icon: IconAdjustments },
      ],
    },
  ]
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <IconShield size={18} stroke={2} />
        </div>
        <span className="text-sm font-semibold tracking-tight">{t('common:nav.adminTitle')}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ProSidebar groups={groups} embedded onNavigate={onNavigate} />
      </div>
      <div className="border-t border-border/60 p-3">
        <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <IconArrowLeft size={20} stroke={1.5} />
          {t('common:nav.backToUser')}
        </NavLink>
      </div>
    </div>
  )
}
```

注：ProSidebar `embedded` 时无边框（已在 Task 11 实现）；上方标题栏与下方返回入口在外层包。若 ProSidebar `embedded` 仍带 `bg-background`/内边距导致双 padding，按实际渲染调整 ProSidebar 的 `embedded` 分支去掉 `p-3`，或外层不另加 padding。先渲染再微调。

- [ ] **Step 2: 校验 tabler 图标名存在**

Run: `cd frontend && node -e "const i=require('@tabler/icons-react'); ['IconLayoutDashboard','IconUsers','IconCreditCard','IconCoin','IconFileText','IconRobot','IconBook2','IconHistory','IconAdjustments','IconChartBar','IconArrowLeft','IconShield'].forEach(n=>{if(!i[n])throw new Error('missing '+n)}); console.log('icons ok')"`
Expected: 输出 `icons ok`；若有 missing，换成存在的近似名（如 `IconHistory`→`IconHistory` 在，`IconAdjustments`→核对）后重跑

- [ ] **Step 3: 校验类型**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "AdminSidebar" | head`
Expected: 无输出

- [ ] **Step 4: 跑后台相关测试**

Run: `cd frontend && npm test -- admin 2>&1 | tail -15`
Expected: 现有 admin 测试 PASS；若有断言依赖旧 lucide 图标或扁平结构，按失败更新断言

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): AdminSidebar 改为 ProSidebar 四分组"
```

---

### Task 17: AdminLayout 接入分组侧栏 + 手机抽屉

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.tsx`

后台手机端用顶部栏 + 抽屉（复用现有 `MobileAdminDrawer`，其内部已引用 AdminSidebar，自动继承分组）。桌面端用新 AdminSidebar。本 task 主要确认布局壳正确接入，并加面包屑（ProBreadcrumb）。

- [ ] **Step 1: 读现有 AdminLayout 结构**

Run: `cd frontend && cat src/layouts/AdminLayout.tsx`
了解现有 header/leading/主体结构后再改。

- [ ] **Step 2: 在 AdminLayout 顶部加 ProBreadcrumb**

按 Step 1 读到的结构，在主体内容区顶部插入面包屑。面包屑 items 用路由 pathname 映射：

```tsx
import { ProBreadcrumb } from '@/components/pro/ProBreadcrumb'

const ADMIN_CRUMB: Record<string, string> = {
  '/admin': '概览',
  '/admin/users': '用户管理',
  '/admin/stats': '统计',
  '/admin/plans': '套餐',
  '/admin/revenue': '收入',
  '/admin/site-content': '站点内容',
  '/admin/crawler': '爬虫',
  '/admin/catalog': '目录',
  '/admin/audit-log': '审计日志',
  '/admin/system-settings': '系统设置',
}
// 在主体顶部：
<ProBreadcrumb items={[{ label: '后台', to: '/admin' }, { label: ADMIN_CRUMB[location.pathname] ?? '' }]} />
```

（label 走 i18n 更佳，但为控制本 task 范围，先用静态映射；i18n 化可后续 task。）

- [ ] **Step 3: 校验类型**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "AdminLayout" | head`
Expected: 无输出

- [ ] **Step 4: 跑全量测试确认无回归**

Run: `cd frontend && npm test 2>&1 | tail -20`
Expected: 除 4 个已知 master 基线失败（agentOrchestration/agentToolResultLabels/ccToolDisplay/debouncedScroll）外无新增失败

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/layouts/AdminLayout.tsx
git commit -m "feat(admin): AdminLayout 接入分组侧栏 + ProBreadcrumb 面包屑"
```

---

## Phase 7 — 页面分端重构（仪表盘首页 + 小说页样板）

> 本 Phase 建立分端重构的**标准模式**：`<page>/use<Page>.ts`（共享逻辑）+ `desktop/` + `mobile/` + `<Page>.tsx`（分发器）。后续其余页面（书库/计费/设置、后台各页）照此模式复制，不在本计划逐一展开（见 Phase 8 说明）。

### Task 18: 仪表盘首页分端重构（共享 hook + 桌面/手机分发）

**Files:**
- Create: `frontend/src/pages/dashboard/home/useDashboardHome.ts`
- Create: `frontend/src/pages/dashboard/home/DashboardHomeDesktop.tsx`
- Create: `frontend/src/pages/dashboard/home/DashboardHomeMobile.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardHomePage.tsx`

把现有 `DashboardHomePage.tsx` 的数据获取逻辑抽到 `useDashboardHome`，桌面/手机两套呈现。桌面用 KPI 行 + ProAreaChart（Token）+ 活动趋势 + 热力图；手机用纵向堆叠的紧凑卡片。复用现有 `fetchUsageTrends`/`dashboardCacheStore`。

- [ ] **Step 1: 抽共享 hook useDashboardHome**

`frontend/src/pages/dashboard/home/useDashboardHome.ts`:

```ts
import { useEffect, useState } from 'react'
import { fetchUsageTrends, type UsageTrendPoint } from '@/api/dashboardApi'
import { useDashboardCacheStore } from '@/stores/dashboardCacheStore'

export interface DashboardHomeData {
  tokenTrends: UsageTrendPoint[]
  tokenLoading: boolean
  // 其余活动/小说数据按现有 DashboardHomePage 用到的字段迁移进来
}

export function useDashboardHome(): DashboardHomeData {
  const tokenTrendsCache = useDashboardCacheStore((s) => s.tokenTrendsCache)
  const getTokenTrends = useDashboardCacheStore((s) => s.getTokenTrends)
  const setTokenTrends = useDashboardCacheStore((s) => s.setTokenTrends)
  const [tokenTrends, setLocal] = useState<UsageTrendPoint[]>(() => getTokenTrends() ?? [])
  const [tokenLoading, setTokenLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setTokenLoading(true)
    void fetchUsageTrends()
      .then((pts) => { if (!cancelled) { setLocal(pts); setTokenTrends(pts) } })
      .catch(() => { if (!cancelled) { setLocal([]) } })
      .finally(() => { if (!cancelled) setTokenLoading(false) })
    return () => { cancelled = true }
  }, [setTokenTrends])

  return { tokenTrends, tokenLoading }
}
```

注：`fetchUsageTrends`/`UsageTrendPoint`/`tokenTrendsCache`/`getTokenTrends`/`setTokenTrends` 的真实导出名以仓库现存为准（仪表盘样式优化已建立）。实现前先 `grep -rn "fetchUsageTrends\|tokenTrendsCache\|getTokenTrends" src/api src/stores` 核对，按真实签名调整。

- [ ] **Step 2: 核对数据源真实导出**

Run: `cd frontend && grep -rn "export.*fetchUsageTrends\|export.*UsageTrendPoint\|tokenTrendsCache" src/api src/stores/dashboardCacheStore.ts | head`
按真实名修正 Step 1 的 import。

- [ ] **Step 3: 实现桌面视图**

`frontend/src/pages/dashboard/home/DashboardHomeDesktop.tsx`：

```tsx
import { useTranslation } from 'react-i18next'
import { useDashboardHome } from './useDashboardHome'
import { ProChartKpi } from '@/components/pro/ProChartKpi'
import { ProAreaChart } from '@/components/pro/charts/ProAreaChart'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'

export function DashboardHomeDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { tokenTrends, tokenLoading } = useDashboardHome()
  const total = tokenTrends.reduce((s, p) => s + (p.tokens ?? 0), 0)
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProChartKpi label={t('home:tokenTitle')} value={tokenLoading ? '—' : total.toLocaleString()} loading={tokenLoading} />
        {/* 其余 KPI 按现有 DashboardHomePage 迁移 */}
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t('home:tokenTitle')}</h3>
        <ProAreaChart
          data={tokenTrends.map((p) => ({ date: p.date, tokens: p.tokens ?? 0 }))}
          xKey="date"
          valueKey="tokens"
          emptyText={t('home:tokenEmpty')}
        />
      </div>
      <ActivityHeatmap />
    </div>
  )
}
```

- [ ] **Step 4: 实现手机视图**

`frontend/src/pages/dashboard/home/DashboardHomeMobile.tsx`：

```tsx
import { useTranslation } from 'react-i18next'
import { useDashboardHome } from './useDashboardHome'
import { ProChartKpi } from '@/components/pro/ProChartKpi'
import { ProAreaChart } from '@/components/pro/charts/ProAreaChart'

export function DashboardHomeMobile() {
  const { t } = useTranslation(['dashboard'])
  const { tokenTrends, tokenLoading } = useDashboardHome()
  const total = tokenTrends.reduce((s, p) => s + (p.tokens ?? 0), 0)
  return (
    <div className="space-y-4">
      <ProChartKpi label={t('home:tokenTitle')} value={tokenLoading ? '—' : total.toLocaleString()} loading={tokenLoading} />
      <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('home:tokenTitle')}</h3>
        <ProAreaChart data={tokenTrends.map((p) => ({ date: p.date, tokens: p.tokens ?? 0 }))} xKey="date" valueKey="tokens" height={160} emptyText={t('home:tokenEmpty')} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 改 DashboardHomePage 为分发器**

`frontend/src/pages/dashboard/DashboardHomePage.tsx` 新内容：

```tsx
import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() => import('./home/DashboardHomeDesktop').then((m) => ({ default: m.DashboardHomeDesktop })))
const Mobile = lazy(() => import('./home/DashboardHomeMobile').then((m) => ({ default: m.DashboardHomeMobile })))

export default function DashboardHomePage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
```

- [ ] **Step 6: 校验类型**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "dashboard/home|DashboardHomePage" | head`
Expected: 无输出

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/pages/dashboard/home/ src/pages/dashboard/DashboardHomePage.tsx
git commit -m "feat(dashboard): 首页分端重构（共享 hook + 桌面/手机分发器）"
```

---

### Task 19: 我的小说页分端重构（表格/卡片列表样板）

**Files:**
- Create: `frontend/src/pages/dashboard/novels/useNovelsPage.ts`
- Create: `frontend/src/pages/dashboard/novels/NovelsPageDesktop.tsx`
- Create: `frontend/src/pages/dashboard/novels/NovelsPageMobile.tsx`
- Modify: `frontend/src/pages/dashboard/NovelsPage.tsx`

桌面用 `ProTable` + `ProPagination`，手机用卡片列表。共享 hook 承载数据/分页。

- [ ] **Step 1: 抽 useNovelsPage**

读现有 `NovelsPage.tsx` 的数据获取与分页逻辑，迁移到 `useNovelsPage.ts`：导出 `{ novels, loading, page, pageSize, total, setPage, refetch }`。具体字段以现有实现为准：

Run: `cd frontend && grep -nE "useState|fetch|page|total|setPage" src/pages/dashboard/NovelsPage.tsx | head -30`

按读到的逻辑写 hook（保持行为不变，仅搬移）。

- [ ] **Step 2: 实现桌面 NovelsPageDesktop（ProTable + ProPagination）**

`frontend/src/pages/dashboard/novels/NovelsPageDesktop.tsx`：用 `ProTable` 列定义（书名/分类/章节数/更新时间/操作），底部分页 `ProPagination`。操作列保留现有「编辑/续写」按钮（用 `ProButton` ghost）。

- [ ] **Step 3: 实现手机 NovelsPageMobile（卡片列表）**

`frontend/src/pages/dashboard/novels/NovelsPageMobile.tsx`：每本小说一张 `rounded-2xl border` 卡片，封面缩略 + 标题 + 分类 + 章节数 + 操作按钮，纵向堆叠 `space-y-3`，滚动加载或简分页。

- [ ] **Step 4: 改 NovelsPage 为分发器**

`frontend/src/pages/dashboard/NovelsPage.tsx`：同 Task 18 Step 5 模式，`useIsDesktop()` 分发 Desktop/Mobile，`<Suspense>` 包裹。

- [ ] **Step 5: 更新现有 NovelsPage 测试**

Run: `cd frontend && cat src/pages/dashboard/NovelsPage.test.tsx`
若测试直接渲染 NovelsPage 并断言内部结构，按分发器结构更新（mock `useIsDesktop` 为 true，断言桌面视图渲染；或拆测试到 desktop/mobile 各一份）。

- [ ] **Step 6: 校验类型 + 跑测试**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "novels/" | head && npm test -- NovelsPage 2>&1 | tail -15`
Expected: 无类型错误；NovelsPage 测试 PASS

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/pages/dashboard/novels/ src/pages/dashboard/NovelsPage.tsx src/pages/dashboard/NovelsPage.test.tsx
git commit -m "feat(dashboard): 我的小说页分端重构（ProTable 桌面 / 卡片列表手机）"
```

---

## Phase 8 — 其余页面复用模式 + 收尾

### Task 20: 其余仪表盘页分端重构（书库/计费/设置）

**Files:**
- `frontend/src/pages/dashboard/{bookstore,my-library,billing,settings}/` 各建 `use<Page>.ts` + `Desktop.tsx` + `Mobile.tsx`
- Modify: 对应 `frontend/src/pages/dashboard/{BookstorePage,MyLibraryPage,BillingPage,SettingsPage}.tsx` 改为分发器

复用 Task 18/19 建立的模式逐页迁移。每页独立提交。重点：

- **MyLibraryPage**：桌面 `ProTable`（书名/作者/章节数/操作）+ 「去书库添加更多」`ProButton`；手机卡片列表。
- **BillingPage**：桌面 `ProTabs`（套餐/账单/订阅）+ `ProTable`；手机纵向分段。
- **SettingsPage**：桌面分区卡片（账户/安全/反馈，复用现有 `SettingsFeedbackCard`）；手机单列堆叠。
- **BookstorePage**：桌面网格卡片；手机单列。

- [ ] **Step 1: 逐页迁移**（每页：抽 hook → desktop → mobile → 分发器 → tsc → 测试 → commit）

每页命令模板：
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "<page>/" | head
cd frontend && npm test -- <Page> 2>&1 | tail -15
cd frontend && git add src/pages/dashboard/<page>/ src/pages/dashboard/<Page>Page.tsx
git commit -m "feat(dashboard): <页名>分端重构"
```

- [ ] **Step 2: 全量类型 + 测试回归**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5 && npm test 2>&1 | tail -20`
Expected: 无类型错误；除 4 个已知 master 基线失败外无新增失败

- [ ] **Step 3: Commit（若 Step 1 已逐页提交，此步合并验证即可）**

```bash
cd frontend && git status
```
Expected: working tree clean

---

### Task 21: 后台页面接入 Pro 组件（表格/分页统一替换）

**Files:**
- Modify: `frontend/src/pages/admin/{UsersPage,PlansPage,RevenuePage,StatsPage,CrawlerPage,CatalogPage,AuditLogPage,SystemSettingsPage,SiteContentPage}.tsx`
- Modify: `frontend/src/components/admin/{UserTable,AdminPagination}.tsx`（改为基于 ProTable/ProPagination 的薄封装，或直接替换引用）

后台各页的表格从 `DataTableFrame`+`ResponsiveTable` 切到 `ProTable`，分页切 `ProPagination`，按钮切 `ProButton`。后台不强制分端（管理员手机场景少），但保证 `useIsDesktop` 下表格/卡片自适应（ProTable 已 `overflow-x-auto`）。

- [ ] **Step 1: UserTable 改为 ProTable 封装**

读现有 `UserTable.tsx` 列定义，迁移到 `ProTable<AdminUser>` 列定义，保留行操作（编辑/禁用）。

- [ ] **Step 2: AdminPagination 改为 ProPagination 薄封装**

`AdminPagination` 内部委托 `ProPagination`，保持外部 props 不变（兼容现有页面调用）。

- [ ] **Step 3: 各后台页替换表格/分页/按钮引用**

逐页把 `DataTableFrame`/`ResponsiveTable`/`AdminPagination`/`Button` 替换为 Pro 组件。每页 tsc + 测试 + commit。

- [ ] **Step 4: 全量回归**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5 && npm test 2>&1 | tail -20`
Expected: 无新增失败

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/pages/admin/ src/components/admin/UserTable.tsx src/components/admin/AdminPagination.tsx
git commit -m "feat(admin): 后台页面表格/分页/按钮统一替换为 Pro 组件"
```

---

### Task 22: 暗色模式校验 + reduced-motion 校验 + 视觉走查

**Files:**
- 无新增文件；校验既有

- [ ] **Step 1: 暗色模式下 Pro 组件 token 校验**

Run: `cd frontend && npm run dev`（或本地已起的 dev server）
浏览器开 `http://127.0.0.1:3000/dashboard`，切暗色（主题切换），确认：
- ProSidebar/ProTabBar 背景跟随 `bg-background`（暗色 slate-950 系）
- ProTable/ProChartKpi 卡片边框 `border-border/60` 在暗色可见
- IconStroke active 描边 indigo 在暗色仍清晰

- [ ] **Step 2: reduced-motion 下图标不绘制**

浏览器 DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`，确认选中菜单图标直接显示（无 420ms 绘制动画）。

- [ ] **Step 3: 手机视口走查**

DevTools 切 375px 宽：确认仪表盘底部 ProTabBar 4 项可见、内容区 `pb-16` 不被遮挡；后台抽屉可开合。

- [ ] **Step 4: 编辑器/Agent/登录页零回归走查**

访问 `/editor/<某章>`、Agent 对话、`/login`，确认视觉与功能无变化（未触 Pro 组件）。

- [ ] **Step 5: Commit（如有微调）**

```bash
cd frontend && git add -A && git commit -m "style(pro): 暗色/reduced-motion/手机视口走查微调" || echo "no changes"
```

---

## Self-Review（plan 自检）

**1. Spec 覆盖核对：**

| Spec 要求 | 覆盖 Task |
|-----------|-----------|
| shadcn/Tailwind 底座 + tabler 图标 + token，不引 @tabler/core CSS | Task 1（依赖+token）、Task 2（图标）、Task 3（样式） |
| Editorial 基调（大数值/分隔线/indigo 单点） | Task 5（ProChartKpi）、Task 7（ProTable 细分隔）、各页面 task |
| 菜单图标 SVG 描边绘制动画 + reduced-motion | Task 2（IconStroke）、Task 3（pro.css 动画+reduced） |
| 后台四分组全展开带小标题 / 仪表盘仅小标题 | Task 11（ProSidebar）、Task 16（AdminSidebar 四组）、Task 14（仪表盘单组）、Task 10（i18n） |
| 桌面/手机两套独立页面 + 路由分发 | Task 13（useIsDesktop）、Task 18/19/20（分发器模式） |
| 手机仪表盘底部 Tabbar 4 项 | Task 12（ProTabBar）、Task 14（接入） |
| 后台手机端抽屉 | Task 17（AdminLayout，复用 MobileAdminDrawer） |
| 组件封装：表格/图表/下拉/按钮/tabbar/foot/分页/面包屑/导航栏标签 | Task 4(button)/5(kpi)/6(chart)/7(table)/8(pagination)/9(breadcrumb,tabs,select,navtabs,footer)/11(sidebar)/12(tabbar) |
| 暗色模式保留 | Task 22（校验），token 复用现有 .dark 体系 |
| 仅仪表盘+后台，编辑器等不动 | 全 plan 范围限定；Task 22 Step 4 走查零回归 |
| 不删现有 ui/ | 各 task 显式新建 components/pro/，不删 ui/ |

**2. 占位符扫描：** 无 TBD/TODO/「类似 Task N」。Task 20/21 对多页迁移给出逐页命令模板与字段指引（非占位，因各页结构需读现存代码后迁移，已给 grep 锚点与替换目标）。Task 18/19 的 hook 字段标注「以仓库现存为准」并给了核对 grep——这是必要的对齐步骤，非占位。

**3. 类型一致性核对：**
- `ProSidebarGroup`/`ProSidebarItem` 在 Task 11 定义，Task 14/16 消费，字段 `title/items/label/to/icon/end` 一致。
- `ProColumn<T>` / `ProTableProps<T>` Task 7 定义，Task 19/21 消费，`key/header/render/align` 一致。
- `IconStrokeProps` Task 2 定义（`icon/label/active/prefersReducedMotion/size`），Task 11/12 消费一致。
- `ProSidebarProps.footer` Task 15 新增，Task 14/15 消费一致。
- `useIsDesktop` Task 13 定义，Task 18/19/20 消费一致。
- Tabler icon 类型别名 `TablerIcon` 在 Task 2/11/12 各自定义（一致：`ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>`）。

**潜在风险（实现时注意，非 plan 缺陷）：**
- Task 14/15 的头像组件导出名需核对（已给 grep）。
- Task 16 tabler 图标名需核对存在性（已给 node 校验脚本）。
- Task 18 数据源导出名需核对（已给 grep）。
- ProSidebar `embedded` 内边距可能与外层标题栏双 padding，需渲染后微调（Task 16 已注明）。

---

## 验收

- [ ] `cd frontend && npx tsc --noEmit` 无新增错误
- [ ] `cd frontend && npm test` 除 4 个 master 基线失败外全 PASS
- [ ] 仪表盘桌面：ProSidebar 单组小标题 + ProTabBar 隐藏 + ProChartKpi/ProAreaChart + 描边动画
- [ ] 仪表盘手机：ProTabBar 4 项常驻 + 纵向堆叠卡片
- [ ] 后台桌面：ProSidebar 四分组 + ProBreadcrumb + ProTable/ProPagination/ProButton
- [ ] 后台手机：抽屉可开合
- [ ] 暗色模式正常；reduced-motion 图标不绘制
- [ ] 编辑器/Agent/登录/营销页零回归

---

## 执行选择

**Plan complete and saved to `docs/superpowers/plans/2026-06-20-dashboard-admin-dedemo-refactor.md`. Two execution options:**

**1. Subagent-Driven（推荐）** — 每个 task 派一个新 subagent，任务间我做两阶段 review，迭代快、上下文干净

**2. Inline Execution** — 本会话内 executing-plans 批量执行，带 checkpoint

**Which approach?**

