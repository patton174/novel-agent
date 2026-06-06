import { Check } from 'lucide-react'
import { Button } from '../components/ui/button'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'

const TIERS = [
  {
    name: 'Hobby',
    price: 'Free',
    desc: 'Perfect for casual writers and hobbyists.',
    features: ['10,000 AI Tokens / month', 'Basic Editor', 'Community Support', 'Export to TXT'],
    highlight: false,
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    price: '¥99',
    period: '/mo',
    desc: 'For dedicated novelists and professionals.',
    features: ['1,000,000 AI Tokens / month', 'Advanced AI Brainstorming', 'Priority Support', 'Export to PDF/EPUB', 'Custom AI Models'],
    highlight: true,
    cta: 'Upgrade to Pro',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For publishing houses and teams.',
    features: ['Unlimited AI Tokens', 'Team Collaboration', 'Dedicated Account Manager', 'Custom Integrations'],
    highlight: false,
    cta: 'Contact Sales',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <MarketingNav />
      
      <main className="flex-1 pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your writing journey. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col p-8 rounded-3xl bg-surface border transition-all duration-300 hover:-translate-y-1 ${
                  tier.highlight 
                    ? 'border-primary shadow-hover ring-1 ring-primary/20' 
                    : 'border-border shadow-soft hover:shadow-hover'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className={`text-xl font-semibold mb-2 ${tier.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                    {tier.period && <span className="text-muted-foreground font-medium">{tier.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">{tier.desc}</p>
                </div>

                <div className="flex-1">
                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  variant={tier.highlight ? 'default' : 'outline'} 
                  className={`w-full h-12 rounded-xl text-base font-semibold ${tier.highlight ? 'shadow-md shadow-primary/20' : ''}`}
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <HomeFooterSection />
    </div>
  )
}
