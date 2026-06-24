import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

/** 小尺寸 UI 用描边图标（14–18px 清晰可读，对齐 Neo-Brutalist 像素风） */
function Icon({ className, children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('size-[18px] shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

export const PixelIcons = {
  ArrowLeft: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Icon>
  ),
  Settings: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Icon>
  ),
  Pencil: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  ),
  Graph: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <circle cx="6" cy="6" r="2.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="8" r="2.25" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2.25" fill="currentColor" stroke="none" />
      <path d="M8 7.5 16 9M7.5 8.5 9.5 16.5M16.5 9.5 11.5 16" />
    </Icon>
  ),
  Menu: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  ),
  X: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  ),
  Sun: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Icon>
  ),
  Moon: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  ),
  Monitor: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8 20h8M12 16v4" />
    </Icon>
  ),
  Globe: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Icon>
  ),
  Logout: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </Icon>
  ),
  ArrowRight: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  ),
  LogIn: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </Icon>
  ),
  UserPlus: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </Icon>
  ),
  Library: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="m4 19.5 16-7.5V6L4 13.5V19.5z" />
      <path d="M4 13.5 20 6" />
    </Icon>
  ),
  Shield: (props: SVGProps<SVGSVGElement>) => (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </Icon>
  ),
}
