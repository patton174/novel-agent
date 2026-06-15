import React from 'react'
import { normalizeToolName } from './agentToolNames'
import { toolIconSvgClass } from '@/lib/toolIconClasses'

export interface ToolIconProps {
  name: string
  size?: number
  className?: string
  /** 执行中：SVG 描边描画动画 */
  animate?: boolean
}

type IconPath = React.ReactNode

const ICONS: Record<string, IconPath> = {
  Read: (
    <>
      <path d="M5 5h7a2 2 0 0 1 2 2v11H7a2 2 0 0 1-2-2V5z" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M12 7h7v11h-7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </>
  ),
  Write: (
    <>
      <path d="M6 5h9l3 3v11H6V5z" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M12 11v6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  Edit: (
    <path
      d="M4 21l3.5-1 11-11-3-3L4.5 17 4 21zm10.5-14.5 3 3"
      stroke="currentColor"
      strokeWidth="1.65"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  Glob: (
    <>
      <path
        d="M5 7h6l2-2h6v12H5V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  Grep: (
    <path d="M10 18a6 6 0 1 1 4-10M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  ),
  Delete: (
    <>
      <path d="M9 4h6M10 7h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 7h10v12H7V7z" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  AskUser: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.2 1.8c0 1.8-2.5 2.2-2.5 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </>
  ),
  TodoWrite: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.65" fill="none" />
      <path d="M9 12h6M9 8.5h4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </>
  ),
  ToolSearch: (
    <>
      <circle cx="10" cy="10" r="5" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M14 14l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 8h4M10 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  WebFetch: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M4 12h16M12 4c2 2.5 3 5.5 3 8s-1 5.5-3 8M12 4c-2 2.5-3 5.5-3 8s1 5.5 3 8" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </>
  ),
  WebSearch: (
    <>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  Skill: (
    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
  ),
  Agent: (
    <>
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <circle cx="16" cy="15" r="3" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M11.5 11.5l2 2" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  TaskList: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M9 9h6M9 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  EnterPlanMode: (
    <path d="M5 6h14v12H5V6zm3 3h8M8 12h5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  ),
  ExitPlanMode: (
    <path d="M5 6h14v12H5V6zm6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  NotebookEdit: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  ListMcpResources: (
    <path d="M6 6h12v4H6V6zm0 8h12v4H6v-4z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
  ),
  ReadMcpResource: (
    <>
      <path d="M6 5h8l4 4v10H6V5z" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M10 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  think: (
    <path
      d="M12 3a5 5 0 0 0-2.4 9.4V14h4.8v-1.6A5 5 0 0 0 12 3zm-1.2 13h2.4l.6 2.5h-3.6l.6-2.5z"
      fill="currentColor"
    />
  ),
  reasoning: (
    <path
      d="M9 18h6M10 4a4 4 0 0 0 0 8h4a4 4 0 1 1 0 8h-1"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
    />
  ),
  context_search: (
    <>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  refine: (
    <path d="M4 20l7-7 3 3-7 7H4v-4zM14 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  end: (
    <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  confirm: (
    <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  user_input: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M8 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
}

;['TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate', 'TaskStop'].forEach((k) => {
  if (!ICONS[k]) {
    ICONS[k] = ICONS.TaskList
  }
})

;([
  ['ReadMemory', 'Read'],
  ['ReadChapter', 'Read'],
  ['WriteMemory', 'Write'],
  ['WriteChapter', 'Write'],
  ['EditMemory', 'Edit'],
  ['EditChapter', 'Edit'],
  ['DeleteMemory', 'Delete'],
  ['DeleteChapter', 'Delete'],
  ['ListMemory', 'Glob'],
  ['ListChapters', 'Glob'],
  ['SearchKnowledge', 'Grep'],
] as const).forEach(([alias, base]) => {
  if (!ICONS[alias]) {
    ICONS[alias] = ICONS[base]
  }
})

const DEFAULT_ICON = (
  <path
    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
)

export function ToolIcon({ name, size = 16, className, animate = false }: ToolIconProps) {
  const key = normalizeToolName(name) || name
  const paths = ICONS[key] ?? DEFAULT_ICON
  return (
    <svg
      className={toolIconSvgClass(animate, className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      data-tool-icon={key}
    >
      {paths}
    </svg>
  )
}
