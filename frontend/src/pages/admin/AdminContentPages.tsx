import SiteContentPage, { type SiteContentScope } from './SiteContentPage'

export function AdminLegalContentPage() {
  return <SiteContentPage scope="legal" />
}

export function AdminAnnouncementsContentPage() {
  return <SiteContentPage scope="announcements" />
}

export function AdminSitePagesContentPage() {
  return <SiteContentPage scope="pages" />
}

export type { SiteContentScope }
