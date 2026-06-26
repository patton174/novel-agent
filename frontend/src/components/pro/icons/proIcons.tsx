import type { ReactNode, SVGProps } from 'react'

/**
 * 写实图标集 —— Solar Bold Duotone（内联 SVG，离线零网络依赖）。
 *
 * 写实来源：Solar bold-duotone 用实心填充 + 第二层 opacity(.4/.5/.7) 叠出体积感，
 * 比抽象线稿更接近"真实物件"。两层都 fill="currentColor"，故整体随文字色收敛——
 * 选中态文字色 = indigo（primary），未选中 = muted-foreground，自然形成单色双色层次，
 * 不破坏 Editorial 静奢的单色克制。
 *
 * 图标 body 取自 @iconify-json/solar（devDep，仅作提取来源，运行时不引用）：
 *   pnpm add -D @iconify-json/solar
 * 如需增删图标，从 node_modules/@iconify-json/solar/icons.json 取对应 `*.bold-duotone` 的 body 内联即可。
 *
 * 注意：填充图标不参与 IconStroke 的 pathLength 描边绘制动画（只对 stroke 元素生效）。
 * 选中态由 IconStroke 的 .pro-icon-fill--active（配色 + 缩放 + 柔阴影）表达。
 */

export interface ProIconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  size?: number | string
  /** 兼容旧接口；duotone 填充图标忽略描边宽度 */
  stroke?: string | number
}

function Svg({ size = 24, className, children, ...rest }: ProIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      stroke="none"
      aria-hidden="true"
      focusable="false"
      {...(rest as SVGProps<SVGSVGElement>)}
    >
      {children}
    </svg>
  )
}

/* ────────── 桌面/移动 dashboard 侧栏 ────────── */

/** 概览：仪表盘小部件，写实填充。 */
export function ProIconOverview(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M2 6.21c0-1.984 0-2.977.659-3.593S4.379 2 6.5 2s3.182 0 3.841.617C11 3.233 11 4.226 11 6.21v11.58c0 1.984 0 2.977-.659 3.593S8.621 22 6.5 22s-3.182 0-3.841-.617C2 20.767 2 19.774 2 17.79z" opacity=".5" />
      <path fill="currentColor" d="M13 15.4c0-2.074 0-3.111.659-3.756S15.379 11 17.5 11s3.182 0 3.841.644C22 12.29 22 13.326 22 15.4v2.2c0 2.074 0 3.111-.659 3.756S19.621 22 17.5 22s-3.182 0-3.841-.644C13 20.71 13 19.674 13 17.6zm0-9.9c0-1.087 0-1.63.171-2.06a2.3 2.3 0 0 1 1.218-1.262C14.802 2 15.327 2 16.375 2h2.25c1.048 0 1.573 0 1.986.178c.551.236.99.69 1.218 1.262c.171.43.171.973.171 2.06s0 1.63-.171 2.06a2.3 2.3 0 0 1-1.218 1.262C20.198 9 19.673 9 18.625 9h-2.25c-1.048 0-1.573 0-1.986-.178a2.3 2.3 0 0 1-1.218-1.262C13 7.13 13 6.587 13 5.5" />
    </Svg>
  )
}

/** 我的小说：带书签的书。 */
export function ProIconNovel(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M12 20.028V18H8v2.028c0 .277 0 .416.095.472s.224-.006.484-.13l1.242-.593c.088-.042.132-.063.179-.063s.091.02.179.063l1.242.593c.26.124.39.186.484.13c.095-.056.095-.195.095-.472" opacity=".5" />
      <path fill="currentColor" d="M8 18h-.574c-1.084 0-1.462.006-1.753.068c-.513.11-.96.347-1.285.667c-.11.108-.164.161-.291.505s-.107.489-.066.78l.022.15c.11.653.31.998.616 1.244c.307.246.737.407 1.55.494c.837.09 1.946.092 3.536.092h4.43c1.59 0 2.7-.001 3.536-.092c.813-.087 1.243-.248 1.55-.494s.506-.591.616-1.243c.091-.548.11-1.241.113-2.171h-8v2.028c0 .277 0 .416-.095.472s-.224-.006-.484-.13l-1.242-.593c-.088-.042-.132-.063-.179-.063s-.091.02-.179.063l-1.242.593c-.26.124-.39.186-.484.13C8 20.444 8 20.305 8 20.028z" />
      <path fill="currentColor" d="M4.727 2.733c.306-.308.734-.508 1.544-.618C7.105 2.002 8.209 2 9.793 2h4.414c1.584 0 2.688.002 3.522.115c.81.11 1.238.31 1.544.618c.305.308.504.74.613 1.557c.112.84.114 1.955.114 3.552V18H7.426c-1.084 0-1.462.006-1.753.068c-.513.11-.96.347-1.285.667c-.11.108-.164.161-.291.505A1.3 1.3 0 0 0 4 19.7V7.842c0-1.597.002-2.711.114-3.552c.109-.816.308-1.249.613-1.557" opacity=".5" />
      <path fill="currentColor" d="M7.25 7A.75.75 0 0 1 8 6.25h8a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 7M8 9.75a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5z" />
    </Svg>
  )
}

/** 我的书库：书库列阵。 */
export function ProIconLibrary(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M8.672 7.542h6.656c3.374 0 5.062 0 6.01.987s.724 2.511.278 5.56l-.422 2.892c-.35 2.391-.525 3.587-1.422 4.303s-2.22.716-4.867.716h-5.81c-2.646 0-3.97 0-4.867-.716s-1.072-1.912-1.422-4.303l-.422-2.892c-.447-3.049-.67-4.573.278-5.56s2.636-.987 6.01-.987M8 18c0-.414.373-.75.833-.75h6.334c.46 0 .833.336.833.75s-.373.75-.833.75H8.833c-.46 0-.833-.336-.833-.75" clipRule="evenodd" />
      <path fill="currentColor" d="M8.51 2h6.98c.233 0 .41 0 .567.015c1.108.109 2.014.775 2.399 1.672H5.544c.385-.897 1.292-1.563 2.4-1.672C8.099 2 8.278 2 8.51 2" opacity=".4" />
      <path fill="currentColor" d="M6.31 4.723c-1.39 0-2.53.84-2.91 1.953l-.024.07a8 8 0 0 1 1.232-.253c1.08-.138 2.446-.138 4.032-.138h6.892c1.586 0 2.952 0 4.032.138c.42.054.834.133 1.232.253l-.023-.07c-.38-1.114-1.52-1.953-2.911-1.953z" opacity=".7" />
    </Svg>
  )
}

/** 用量与账单：账单清单。 */
export function ProIconBilling(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M7.245 2h9.51c1.159 0 1.738 0 2.206.163a3.05 3.05 0 0 1 1.881 1.936C21 4.581 21 5.177 21 6.37v14.004c0 .858-.985 1.314-1.608.744a.946.946 0 0 0-1.284 0l-.483.442a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0l-.483-.442a.946.946 0 0 0-1.284 0c-.623.57-1.608.114-1.608-.744V6.37c0-1.193 0-1.79.158-2.27c.3-.913.995-1.629 1.881-1.937C5.507 2 6.086 2 7.245 2" opacity=".5" />
      <path fill="currentColor" d="M7 6.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5zm3.5 0a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5zM7 10.25a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5zm3.5 0a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5zM7 13.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5zm3.5 0a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5z" />
    </Svg>
  )
}

/** 我的（账户）：写实人像。 */
export function ProIconAccount(props: ProIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="6" r="4" fill="currentColor" />
      <ellipse cx="12" cy="17" fill="currentColor" opacity=".5" rx="7" ry="4" />
    </Svg>
  )
}

/** 太阳（浅色模式）。 */
export function ProIconSun(props: ProIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity=".5" />
      <path fill="currentColor" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

/** 月亮（深色模式）。 */
export function ProIconMoon(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" opacity=".5" />
    </Svg>
  )
}

/** 显示器/跟随系统。 */
export function ProIconMonitor(props: ProIconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" opacity=".5" />
      <path fill="currentColor" d="M8 21h8m-4-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

/** 设置/主题：齿轮。 */
export function ProIconSettings(props: ProIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".5" />
      <path
        fill="currentColor"
        d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** 语言/翻译：地球。 */
export function ProIconLanguage(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm0 2a8 8 0 0 1 6.37 12.67a17 17 0 0 0-.37-4.67h-6v2h5v-3.5h-5v-2h5V6.5H7.63A8 8 0 0 1 12 4z" opacity=".5" />
      <path fill="currentColor" d="M2 12h2a8 8 0 0 1 6.37-4.67A17 17 0 0 0 7.63 19.67A8 8 0 0 1 2 12z" />
    </Svg>
  )
}

/** 退出/登出：离开。 */
export function ProIconLogout(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" opacity=".5" />
      <path fill="currentColor" d="M10 17l5-5l-5-5" />
      <path fill="currentColor" d="M15 12H3" />
    </Svg>
  )
}

/** 写作/铅笔。 */
export function ProIconPencil(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4.24-4.24L3.76 15.76A1 1 0 0 0 4 16.59V20z"
        opacity=".5"
      />
      <path
        fill="currentColor"
        d="m13.5 6.5 4 4M16 4l4 4-2 2-4-4 2-2z"
      />
    </Svg>
  )
}

/* ────────── 管理后台 ────────── */

/** 后台概览（同 dashboard 概览）。 */
export const ProIconAdminOverview = ProIconOverview

/** 统计。 */
export function ProIconAdminStats(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M3.293 9.293C3 9.586 3 10.057 3 11v6c0 .943 0 1.414.293 1.707S4.057 19 5 19s1.414 0 1.707-.293S7 17.943 7 17v-6c0-.943 0-1.414-.293-1.707S5.943 9 5 9s-1.414 0-1.707.293" />
      <path fill="currentColor" d="M17.293 2.293C17 2.586 17 3.057 17 4v13c0 .943 0 1.414.293 1.707S18.057 19 19 19s1.414 0 1.707-.293S21 17.943 21 17V4c0-.943 0-1.414-.293-1.707S19.943 2 19 2s-1.414 0-1.707.293" opacity=".4" />
      <path fill="currentColor" d="M10 7c0-.943 0-1.414.293-1.707S11.057 5 12 5s1.414 0 1.707.293S14 6.057 14 7v10c0 .943 0 1.414-.293 1.707S12.943 19 12 19s-1.414 0-1.707-.293S10 17.943 10 17z" opacity=".7" />
      <path fill="currentColor" d="M3 21.25a.75.75 0 0 0 0 1.5h18a.75.75 0 0 0 0-1.5z" />
    </Svg>
  )
}

/** 用户。 */
export function ProIconAdminUsers(props: ProIconProps) {
  return (
    <Svg {...props}>
      <circle cx="15" cy="6" r="3" fill="currentColor" opacity=".4" />
      <ellipse cx="16" cy="17" fill="currentColor" opacity=".4" rx="5" ry="3" />
      <circle cx="9.001" cy="6" r="4" fill="currentColor" />
      <ellipse cx="9.001" cy="17.001" fill="currentColor" rx="7" ry="4" />
    </Svg>
  )
}

/** 套餐。 */
export function ProIconAdminPlan(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M14.005 4h-4.01c-3.78 0-5.67 0-6.845 1.172c-.81.806-1.061 1.951-1.14 3.817c-.015.37-.023.556.046.679c.07.123.345.278.897.586a1.999 1.999 0 0 1 0 3.492c-.552.309-.828.463-.897.586s-.061.308-.045.678c.078 1.867.33 3.012 1.139 3.818C4.324 20 6.214 20 9.995 20h4.01c3.78 0 5.67 0 6.845-1.172c.81-.806 1.061-1.951 1.14-3.817c.015-.37.023-.556-.046-.679c-.07-.123-.345-.277-.897-.586a1.999 1.999 0 0 1 0-3.492c.552-.308.828-.463.897-.586s.061-.308.045-.679c-.078-1.866-.33-3.01-1.139-3.817C19.676 4 17.786 4 14.005 4" opacity=".5" />
      <path fill="currentColor" d="M15.548 8.47a.75.75 0 0 1 0 1.06l-6.015 6a.753.753 0 0 1-1.064 0a.75.75 0 0 1 0-1.06l6.015-6a.753.753 0 0 1 1.063 0m-1.032 7.03a1.001 1.001 0 1 0 0-2a1.001 1.001 0 1 0 0 2m-5.013-5a1.001 1.001 0 1 0 0-2a1.001 1.001 0 1 0 0 2" />
    </Svg>
  )
}

/** 收入。 */
export function ProIconAdminRevenue(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" clipRule="evenodd" opacity=".5" />
      <path fill="currentColor" d="M12.75 6a.75.75 0 0 0-1.5 0v.317c-1.63.292-3 1.517-3 3.183c0 1.917 1.813 3.25 3.75 3.25c1.377 0 2.25.906 2.25 1.75s-.873 1.75-2.25 1.75c-1.376 0-2.25-.906-2.25-1.75a.75.75 0 0 0-1.5 0c0 1.666 1.37 2.891 3 3.183V18a.75.75 0 0 0 1.5 0v-.317c1.63-.292 3-1.517 3-3.183c0-1.917-1.813-3.25-3.75-3.25c-1.376 0-2.25-.906-2.25-1.75s.874-1.75 2.25-1.75c1.377 0 2.25.906 2.25 1.75a.75.75 0 0 0 1.5 0c0-1.666-1.37-2.891-3-3.183z" />
    </Svg>
  )
}

/** 审计。 */
export function ProIconAdminAudit(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M21 15.998v-6c0-2.828 0-4.242-.879-5.121C19.353 4.109 18.175 4.012 16 4H8c-2.175.012-3.353.109-4.121.877C3 5.756 3 7.17 3 9.998v6c0 2.829 0 4.243.879 5.122c.878.878 2.293.878 5.121.878h6c2.828 0 4.243 0 5.121-.878c.879-.88.879-2.293.879-5.122" opacity=".5" />
      <path fill="currentColor" d="M8 3.5A1.5 1.5 0 0 1 9.5 2h5A1.5 1.5 0 0 1 16 3.5v1A1.5 1.5 0 0 1 14.5 6h-5A1.5 1.5 0 0 1 8 4.5z" />
      <path fill="currentColor" fillRule="evenodd" d="M15.548 10.488a.75.75 0 0 1-.036 1.06l-4.286 4a.75.75 0 0 1-1.024 0l-1.714-1.6a.75.75 0 1 1 1.024-1.096l1.202 1.122l3.774-3.522a.75.75 0 0 1 1.06.036" clipRule="evenodd" />
    </Svg>
  )
}

/** 内容。 */
export function ProIconAdminContent(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M3 10c0-3.771 0-5.657 1.172-6.828S7.229 2 11 2h2c3.771 0 5.657 0 6.828 1.172S21 6.229 21 10v4c0 3.771 0 5.657-1.172 6.828S16.771 22 13 22h-2c-3.771 0-5.657 0-6.828-1.172S3 17.771 3 14z" opacity=".5" />
      <path fill="currentColor" fillRule="evenodd" d="M7.25 12a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75m0-4A.75.75 0 0 1 8 7.25h8a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 8m0 8a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75" clipRule="evenodd" />
    </Svg>
  )
}

/** 爬虫。 */
export function ProIconAdminCrawler(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M19 11.938V15a7 7 0 0 1-6.25 6.96V15a.75.75 0 0 0-1.5 0v6.96A7 7 0 0 1 5 15v-3.062A3.94 3.94 0 0 1 8.938 8h6.124A3.94 3.94 0 0 1 19 11.938" clipRule="evenodd" opacity=".5" />
      <path fill="currentColor" d="M19 14.75v-1.5h3a.75.75 0 0 1 0 1.5zm-1.504 4.586c.31-.393.58-.82.801-1.276l2.538 1.27a.75.75 0 1 1-.67 1.34zM5.703 18.06q.333.684.801 1.276l-2.669 1.335a.75.75 0 0 1-.67-1.342zM5 13.25H2a.75.75 0 0 0 0 1.5h3zm12.354-4.515l2.81-1.406a.75.75 0 1 1 .671 1.341L18.42 9.88a4 4 0 0 0-1.065-1.144M6.647 8.735c-.427.306-.79.695-1.067 1.144L3.165 8.67a.75.75 0 0 1 .67-1.341zM16.5 8.27V7.5a4.5 4.5 0 1 0-9 0v.77A3.9 3.9 0 0 1 8.938 8h6.124c.508 0 .993.096 1.438.27" />
      <path fill="currentColor" d="M6.376 1.584a.75.75 0 0 0 .208 1.04l2.36 1.573a4.5 4.5 0 0 1 1.387-.877L7.416 1.376a.75.75 0 0 0-1.04.208m8.68 2.613a4.5 4.5 0 0 0-1.387-.877l2.915-1.944a.75.75 0 1 1 .832 1.248z" opacity=".5" />
      <path fill="currentColor" fillRule="evenodd" d="M12 14.25a.75.75 0 0 1 .75.75v7h-1.5v-7a.75.75 0 0 1 .75-.75" clipRule="evenodd" />
    </Svg>
  )
}

/** 书库（同 dashboard 书库）。 */
export const ProIconAdminLibrary = ProIconLibrary

/** 系统。 */
export function ProIconAdminSystem(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M6 13h12c1.886 0 2.828 0 3.414.586S22 15.114 22 17s0 2.828-.586 3.414S19.886 21 18 21H6c-1.886 0-2.828 0-3.414-.586S2 18.886 2 17s0-2.828.586-3.414S4.114 13 6 13M6 3h12c1.886 0 2.828 0 3.414.586S22 5.114 22 7s0 2.828-.586 3.414S19.886 11 18 11H6c-1.886 0-2.828 0-3.414-.586S2 8.886 2 7s0-2.828.586-3.414S4.114 3 6 3" opacity=".5" />
      <path fill="currentColor" d="M10.25 7a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75m-5 0A.75.75 0 0 1 6 6.25h2a.75.75 0 0 1 0 1.5H6A.75.75 0 0 1 5.25 7m5 10a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75m-5 0a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75" />
    </Svg>
  )
}

/** 数据分析：折线趋势。 */
export function ProIconAdminAnalytics(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M3 3v18h18" opacity=".4" />
      <path
        fill="currentColor"
        d="M6 16l3.5-4 3 2.5L18 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="16" r="1.5" fill="currentColor" />
      <circle cx="9.5" cy="12" r="1.5" fill="currentColor" opacity=".7" />
      <circle cx="12.5" cy="14.5" r="1.5" fill="currentColor" opacity=".7" />
      <circle cx="18" cy="8" r="1.5" fill="currentColor" />
    </Svg>
  )
}

/** 发卡平台：链接节点。 */
export function ProIconAdminPlatform(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M8.5 12a3.5 3.5 0 1 1 0-7h7a3.5 3.5 0 1 1 0 7z" opacity=".5" />
      <path fill="currentColor" d="M7 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.25" fill="currentColor" />
    </Svg>
  )
}

/** 商品：包装盒。 */
export function ProIconAdminProduct(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M12 2l8 4.5v9L12 22l-8-6.5v-9z" opacity=".5" />
      <path fill="currentColor" d="M12 2v20M4 6.5l8 4.5l8-4.5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </Svg>
  )
}

/** 库存：堆叠货箱。 */
export function ProIconAdminInventory(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M4 10h7v8H4z" opacity=".5" />
      <path fill="currentColor" d="M13 7h7v11h-7z" opacity=".7" />
      <path fill="currentColor" d="M8 5h7v6H8z" />
    </Svg>
  )
}

/** 定价：价签。 */
export function ProIconAdminPricing(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M3 12a9 9 0 1 1 9 9l-5-5z" opacity=".5" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      <path fill="currentColor" d="M11 11h2v5h-2z" />
    </Svg>
  )
}

/** 优惠券：票券。 */
export function ProIconAdminCoupon(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M4 8a2 2 0 0 1 2-2h12v4a2.5 2.5 0 0 0 0 5v4H6a2 2 0 0 1-2-2z" opacity=".5" />
      <path fill="currentColor" d="M12 6v12" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2" />
      <path fill="currentColor" d="M7 10h3M7 14h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  )
}

/** 订单：清单收据。 */
export function ProIconAdminOrder(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M7 2h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2" opacity=".5" />
      <path fill="currentColor" d="M14 2v4h4M8 11h8M8 15h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  )
}

/** 角色：盾牌。 */
export function ProIconAdminRole(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M12 2l8 3v6c0 5-3.5 9.5-8 11c-4.5-1.5-8-6-8-11V5z" opacity=".5" />
      <path fill="currentColor" d="M9.5 12.5l1.75 1.75L15 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** 权限：钥匙。 */
export function ProIconAdminPermission(props: ProIconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="11" r="4" fill="currentColor" opacity=".5" />
      <path fill="currentColor" d="M12 13h8v3h-2v4h-3v-4h-3" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
    </Svg>
  )
}

/** 会员：徽章。 */
export function ProIconAdminMembership(props: ProIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="9" r="5" fill="currentColor" opacity=".5" />
      <path fill="currentColor" d="M8.5 14.5L7 21l5-2.5L17 21l-1.5-6.5" />
      <path fill="currentColor" d="M12 7v4l2 1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  )
}

/** 法律文档。 */
export function ProIconAdminLegal(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M8 3h8l3 3v15H8z" opacity=".5" />
      <path fill="currentColor" d="M16 3v4h4M10 12h6M10 16h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path fill="currentColor" d="M6 7h2v10H6z" opacity=".7" />
    </Svg>
  )
}

/** 系统公告：喇叭。 */
export function ProIconAdminAnnouncement(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M4 10v4h4l6 4V6L8 10z" opacity=".5" />
      <path fill="currentColor" d="M18 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

/** 站点页面。 */
export function ProIconAdminSitePage(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M5 4h10v16H5z" opacity=".5" />
      <path fill="currentColor" d="M9 4h10v16H9z" />
      <path fill="currentColor" d="M11 8h6M11 12h5M11 16h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  )
}

/** 服务监控：脉搏。 */
export function ProIconAdminMonitoring(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M3 12h4l2-5l3 10l2-6h7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor" opacity=".25" />
    </Svg>
  )
}

/** 定时任务：日历钟。 */
export function ProIconAdminJobs(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M5 5h14v16H5z" opacity=".5" />
      <path fill="currentColor" d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="12" cy="15" r="3" fill="currentColor" opacity=".7" />
      <path fill="currentColor" d="M12 14v2l1 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  )
}

/** 模型：芯片。 */
export function ProIconAdminModels(props: ProIconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" opacity=".5" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
      <path fill="currentColor" d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  )
}

/** 上传运维：云上传箭头。 */
export function ProIconAdminUpload(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M12 4v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path fill="currentColor" d="M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path fill="currentColor" d="M5 14v4h14v-4" opacity=".5" />
    </Svg>
  )
}

/** 系统参数（齿轮）。 */
export const ProIconAdminSettings = ProIconSettings

/** 箭头向右：用于"查看全部"等场景。 */
export function ProIconArrowRight(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M12.75 5.25a.75.75 0 0 1 1.06 0l5.72 5.72a1 1 0 0 1 0 1.42l-5.72 5.72a.75.75 0 1 1-1.06-1.06L17.94 12.5H5a.75.75 0 0 1 0-1.5h12.94l-3.19-3.19a.75.75 0 0 1 0-1.06"
        opacity=".5"
      />
      <path fill="currentColor" d="M5 11.25a.75.75 0 0 1 .75-.75H19a.75.75 0 0 1 0 1.5H5.75a.75.75 0 0 1-.75-.75" />
    </Svg>
  )
}

/** 箭头向左：返回、后退。 */
export function ProIconArrowLeft(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path
        fill="currentColor"
        d="M11.25 5.25a.75.75 0 0 1 0 1.06L6.06 11.5l5.19 5.19a.75.75 0 1 1-1.06 1.06l-5.72-5.72a1 1 0 0 1 0-1.42l5.72-5.72a.75.75 0 0 1 1.06 0"
        opacity=".5"
      />
      <path
        fill="currentColor"
        d="M19 11.25a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1 0-1.5H19z"
      />
    </Svg>
  )
}

/** 菜单/汉堡：移动端抽屉触发。 */
export function ProIconMenu(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M4 7.25A.75.75 0 0 1 4.75 6.5h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 7.25" opacity=".5" />
      <path fill="currentColor" d="M4 12a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 12m0 4.75a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75" />
    </Svg>
  )
}

/** 下拉箭头。 */
export function ProIconChevronDown(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M5.17 8.47a.75.75 0 0 1 1.06 0L12 14.24l5.77-6.77a.75.75 0 1 1 1.14.97l-6.34 7.44a.75.75 0 0 1-1.14 0L5.17 9.44a.75.75 0 0 1 0-1.06" opacity=".5" />
      <path fill="currentColor" d="M6.25 9.25a.75.75 0 0 1 1.06 0L12 14.19l4.69-4.94a.75.75 0 1 1 1.08 1.04l-5.23 5.5a.75.75 0 0 1-1.08 0l-5.23-5.5a.75.75 0 0 1 0-1.04" />
    </Svg>
  )
}
