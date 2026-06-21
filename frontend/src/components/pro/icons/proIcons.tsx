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
      <path fill="currentColor" d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6" opacity=".5" />
      <path fill="currentColor" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83a2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0a2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V21a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 0 2-2a2 2 0 0 0-2-2h-.09a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83a2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H21a1.65 1.65 0 0 0 1-1.51V15z" />
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
      <path fill="currentColor" d="M17.71 7.71l-4.42-4.42a1 1 0 0 0-1.42 0l-.71.71l4.42 4.42l.71-.71a1 1 0 0 0 0-1.42l2.12 2.12l-5.13 5.13a1 1 0 0 0 0 1.42l.71.71a1 1 0 0 0 1.42 0l5.13-5.13l2.12 2.12a1 1 0 0 0 1.42 0l.71-.71a1 1 0 0 0 0-1.42l-4.42-4.42l.71.71a1 1 0 0 0 1.42 0z" opacity=".5" />
      <path fill="currentColor" d="M3 21l1.5-1.5l3.5-3.5l1 1l-3.5 3.5z" />
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

/** 箭头向右：用于"查看全部"等场景。 */
export function ProIconArrowRight(props: ProIconProps) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M5.375 12a.625.625 0 0 1-.445-.183l-4.5-4.625a.625.625 0 0 1 0-.859l4.5-4.625a.625.625 0 0 1 .89.859L2.146 11.5H11a.625.625 0 0 1 0 1.25H2.146l3.674 3.824a.625.625 0 0 1-.445 1.001" opacity=".5" />
      <path fill="currentColor" d="M16.5 12a.625.625 0 0 1-.445-.183l-4.5-4.625a.625.625 0 0 1 0-.859l4.5-4.625a.625.625 0 0 1 .89.859L13.271 11.5H21a.625.625 0 0 1 0 1.25H13.271l3.674 3.824a.625.625 0 0 1-.445 1.001" />
    </Svg>
  )
}
