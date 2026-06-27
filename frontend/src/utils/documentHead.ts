type MetaAttr = 'name' | 'property'

function selectorForMeta(key: string, attr: MetaAttr): string {
  return `meta[${attr}="${key}"]`
}

export function upsertMeta(key: string, content: string, attr: MetaAttr = 'name'): void {
  if (!content) {
    return
  }
  let el = document.head.querySelector<HTMLMetaElement>(selectorForMeta(key, attr))
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

export function upsertLink(rel: string, href: string, extra?: Record<string, string>): void {
  if (!href) {
    return
  }
  const selector = extra?.hreflang
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]${extra ? '' : ':not([hreflang])'}`
  let el = document.head.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        el.setAttribute(k, v)
      }
    }
    document.head.appendChild(el)
  }
  el.href = href
}

export function removeMeta(key: string, attr: MetaAttr = 'name'): void {
  document.head.querySelector(selectorForMeta(key, attr))?.remove()
}

export function removeLinks(rel: string): void {
  document.head.querySelectorAll(`link[rel="${rel}"]`).forEach((node) => node.remove())
}

const JSON_LD_ID = 'na-seo-jsonld'

export function upsertJsonLd(data: Record<string, unknown>): void {
  let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = JSON_LD_ID
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export function removeJsonLd(): void {
  document.getElementById(JSON_LD_ID)?.remove()
}
