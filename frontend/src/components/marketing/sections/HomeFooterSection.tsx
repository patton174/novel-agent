import {
  MarketingActionLink,
  MarketingFooter,
  MarketingFooterContent,
  MarketingFooterCta,
  MarketingFooterLinks,
} from '../../../styles/surfaces/marketing'
import { ArrowIcon } from '../icons'

export function HomeFooterSection() {
  const year = new Date().getFullYear()

  return (
    <MarketingFooter>
      <MarketingFooterContent>
        <MarketingFooterCta>
          <MarketingActionLink $primary href="/register">
            <span>免费注册</span>
            <ArrowIcon />
          </MarketingActionLink>
          <MarketingActionLink href="/editor">进入创作台</MarketingActionLink>
        </MarketingFooterCta>

        <MarketingFooterLinks>
          <a href="/privacy">隐私政策</a>
          <span>·</span>
          <a href="/terms">用户协议</a>
          <span>·</span>
          <a href="/contact">联系我们</a>
        </MarketingFooterLinks>

        <p className="copyright">© {year} · 创作无限可能</p>
      </MarketingFooterContent>
    </MarketingFooter>
  )
}
