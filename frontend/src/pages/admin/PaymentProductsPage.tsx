import { Link } from 'react-router-dom'

import { useTranslation } from 'react-i18next'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ExternalLink, Link2, Package, RefreshCw, Save, Settings2, Zap } from 'lucide-react'

import {

  fetchAdminPaymentSettings,

  fetchAdminPlans,

  formatPlanPrice,

  testAdminPaymentSettings,

  updateAdminPaymentSettings,

  updateAdminPlanIdrBinding,

  type AdminPaymentSettings,

  type AdminPlan,

} from '@/api/billingAdminApi'

import { fetchIdrMerchantBasic, fetchIdrProjects, formatIdrProjectLabel, type IdrProjectItem } from '@/api/idrAdminApi'

import { IdrCatalogPanel } from '@/components/admin/IdrCatalogPanel'
import {
  AdminButton,
  AdminButtonGhost,
  AdminButtonIcon,
  AdminButtonOutline,
  AdminField,
  AdminFormActions,
  AdminNotice,
  AdminSelect,
  AdminSummaryBar,
  AdminTabList,
  AdminTabTrigger,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import {
  adminTableCellClass,
  adminTableClass,
  adminTableHeadClass,
} from '@/components/admin/adminUiTokens'
import { IdrProjectSkuPicker } from '@/components/admin/IdrProjectSkuPicker'

import { AdminDataPage } from '@/components/layout/AdminDataLayout'
import {
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'

import { Skeleton } from '@/components/ui/skeleton'

import { Switch } from '@/components/ui/switch'

import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'

import { appToast } from '@/stores/appToastStore'

import { cn } from '@/lib/utils'



type TabId = 'setup' | 'catalog' | 'bind'

type PlanBindingDraft = { projectId: string | null; skuId: string | null }



const TABS: { id: TabId; icon: typeof Settings2 }[] = [

  { id: 'setup', icon: Settings2 },

  { id: 'catalog', icon: Package },

  { id: 'bind', icon: Link2 },

]



export default function PaymentProductsPage() {

  const { t } = useTranslation(['admin'])

  useMarkRouteSeen()



  const [activeTab, setActiveTab] = useState<TabId>('setup')

  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null)

  const [plans, setPlans] = useState<AdminPlan[]>([])

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [testing, setTesting] = useState(false)



  const [merchantName, setMerchantName] = useState<string | null>(null)

  const [projects, setProjects] = useState<IdrProjectItem[]>([])

  const [catalogProjectId, setCatalogProjectId] = useState<string | null>(null)

  const [planBindings, setPlanBindings] = useState<Record<number, PlanBindingDraft>>({})

  const [bindingPlanId, setBindingPlanId] = useState<number | null>(null)



  const [enabled, setEnabled] = useState(false)

  const [baseUrl, setBaseUrl] = useState('')

  const [merchantSecret, setMerchantSecret] = useState('')

  const [publicBaseUrl, setPublicBaseUrl] = useState('')

  const [defaultPayMethod, setDefaultPayMethod] = useState('alipay')

  const [locale, setLocale] = useState('zh-cn')



  const canUseCatalog = Boolean(settings?.merchantSecretSet || merchantSecret.trim())



  const applySettings = useCallback((data: AdminPaymentSettings) => {

    setSettings(data)

    setEnabled(data.enabled)

    setBaseUrl(data.baseUrl ?? '')

    setPublicBaseUrl(data.publicBaseUrl ?? '')

    setDefaultPayMethod(data.defaultPayMethod ?? 'alipay')

    setLocale(data.locale ?? 'zh-cn')

    setMerchantSecret('')

  }, [])



  const syncPlanBindings = useCallback((planList: AdminPlan[]) => {

    const next: Record<number, PlanBindingDraft> = {}

    for (const plan of planList) {

      next[plan.id] = {

        projectId: plan.idrProjectId?.trim() || null,

        skuId: plan.idrSkuId?.trim() || null,

      }

    }

    setPlanBindings(next)

  }, [])



  const loadCatalogMeta = useCallback(async () => {

    if (!canUseCatalog) {

      setMerchantName(null)

      setProjects([])

      return

    }

    try {

      const [merchant, projectList] = await Promise.all([

        fetchIdrMerchantBasic(),

        fetchIdrProjects(),

      ])

      setMerchantName(merchant.name)

      setProjects(projectList)

    } catch {

      setMerchantName(null)

      setProjects([])

    }

  }, [canUseCatalog])



  const load = useCallback(async () => {

    setLoading(true)

    try {

      const [paymentSettings, planList] = await Promise.all([

        fetchAdminPaymentSettings(),

        fetchAdminPlans(),

      ])

      applySettings(paymentSettings)

      setPlans(planList)

      syncPlanBindings(planList)

    } catch (err) {

      appToast.error(err instanceof Error ? err.message : t('admin:products.loadFail'))

    } finally {

      setLoading(false)

    }

  }, [applySettings, syncPlanBindings, t])



  useEffect(() => {

    void load()

  }, [load])



  useEffect(() => {

    void loadCatalogMeta()

  }, [loadCatalogMeta, settings?.merchantSecretSet])



  const handleSave = async () => {

    setSaving(true)

    try {

      const updated = await updateAdminPaymentSettings({

        enabled,

        baseUrl: baseUrl.trim(),

        merchantSecret: merchantSecret.trim() || undefined,

        publicBaseUrl: publicBaseUrl.trim(),

        defaultPayMethod: defaultPayMethod.trim(),

        locale: locale.trim(),

      })

      applySettings(updated)

      await loadCatalogMeta()

      appToast.success(t('admin:products.saveSuccess'))

    } catch (err) {

      appToast.error(err instanceof Error ? err.message : t('admin:products.saveFail'))

    } finally {

      setSaving(false)

    }

  }



  const handleTest = async () => {

    setTesting(true)

    try {

      const result = await testAdminPaymentSettings()

      if (result.ok) {

        appToast.success(result.message)

        void loadCatalogMeta()

      } else {

        appToast.error(result.message)

      }

    } catch (err) {

      appToast.error(err instanceof Error ? err.message : t('admin:products.testFail'))

    } finally {

      setTesting(false)

    }

  }



  const handleBindPlan = async (plan: AdminPlan) => {

    const draft = planBindings[plan.id]

    if (!draft?.projectId || !draft?.skuId) {

      appToast.error(t('admin:products.bindNeedBoth'))

      return

    }

    setBindingPlanId(plan.id)

    try {

      const updated = await updateAdminPlanIdrBinding(plan.id, {

        idrProjectId: draft.projectId,

        idrSkuId: draft.skuId,

      })

      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)))

      setPlanBindings((prev) => ({

        ...prev,

        [plan.id]: {

          projectId: updated.idrProjectId?.trim() || null,

          skuId: updated.idrSkuId?.trim() || null,

        },

      }))

      appToast.success(t('admin:products.bindSuccess', { name: plan.name }))

    } catch (err) {

      appToast.error(err instanceof Error ? err.message : t('admin:products.bindFail'))

    } finally {

      setBindingPlanId(null)

    }

  }



  const paidPlans = useMemo(

    () => plans.filter((p) => p.priceCents != null && p.priceCents > 0),

    [plans],

  )



  const readyPlans = paidPlans.filter((p) => p.paymentReady).length



  return (

    <AdminDataPage>

      <AdminSummaryBar
        actions={
          <>
            <AdminButtonGhost asChild>
              <Link to="/admin/payment-orders?status=DONE">{t('admin:products.viewRedemptions')}</Link>
            </AdminButtonGhost>
            <AdminButtonIcon onClick={() => void load()} disabled={loading} aria-label={t('admin:products.catalogRefresh')}>
              <RefreshCw className="size-4" />
            </AdminButtonIcon>
          </>
        }
      >
        <span>
          {t('admin:products.summaryGateway')}:{' '}
          <strong className={settings?.configured ? 'text-emerald-700' : 'text-amber-700'}>
            {settings?.configured ? t('admin:products.statusConfigured') : t('admin:products.statusNotConfigured')}
          </strong>
        </span>
        <span>
          {t('admin:products.summaryMerchant')}: <strong className="text-foreground">{merchantName ?? '—'}</strong>
        </span>
        <span>
          {t('admin:products.summaryPlansReady')}:{' '}
          <strong className="text-foreground tabular-nums">
            {readyPlans}/{paidPlans.length}
          </strong>
        </span>
      </AdminSummaryBar>

      <AdminTabList
        trailing={
          <AdminButtonGhost asChild>
            <Link to="/admin/payment-orders">{t('admin:products.viewOrders')}</Link>
          </AdminButtonGhost>
        }
      >
        {TABS.map(({ id, icon: Icon }) => (
          <AdminTabTrigger key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
            <Icon className="size-4" />
            {t(`admin:products.tab.${id}`)}
          </AdminTabTrigger>
        ))}
      </AdminTabList>



      {activeTab === 'setup' ? (

        <AppShellCard className="border-border shadow-none">

          <AppShellCardHeader

            className="px-4 py-3"

            title={t('admin:products.gatewayTitle')}

            description={t('admin:products.gatewayDesc')}

            action={

              settings?.docsUrl ? (

                <a

                  href={settings.docsUrl}

                  target="_blank"

                  rel="noreferrer"

                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"

                >

                  {t('admin:products.docsLink')}

                  <ExternalLink className="size-3" />

                </a>

              ) : null

            }

          />

          <AppShellCardBody className="px-4 py-3">

            {loading ? (

              <Skeleton className="h-48 w-full rounded-lg" />

            ) : (

              <SetupForm

                t={t}

                enabled={enabled}

                setEnabled={setEnabled}

                merchantSecret={merchantSecret}

                setMerchantSecret={setMerchantSecret}

                baseUrl={baseUrl}

                setBaseUrl={setBaseUrl}

                publicBaseUrl={publicBaseUrl}

                setPublicBaseUrl={setPublicBaseUrl}

                defaultPayMethod={defaultPayMethod}

                setDefaultPayMethod={setDefaultPayMethod}

                locale={locale}

                setLocale={setLocale}

                settings={settings}

                saving={saving}

                testing={testing}

                onSave={() => void handleSave()}

                onTest={() => void handleTest()}

              />

            )}

          </AppShellCardBody>

        </AppShellCard>

      ) : null}



      {activeTab === 'catalog' ? (

        <AppShellCard className="border-border shadow-none">

          <AppShellCardHeader

            className="px-4 py-3"

            title={t('admin:products.catalogTitle')}

            description={t('admin:products.catalogDescInventory')}

          />

          <AppShellCardBody className="space-y-3 px-4 py-3">

            {loading ? (

              <Skeleton className="h-32 w-full rounded-lg" />

            ) : canUseCatalog ? (

              <>

                <div className="flex flex-wrap items-end gap-3">
                  <AdminField label={t('admin:products.catalogPickProject')} className="min-w-[240px] sm:max-w-sm">
                    <AdminSelect
                      value={catalogProjectId ?? ''}
                      onChange={(e) => setCatalogProjectId(e.target.value || null)}
                    >
                      <option value="">{t('admin:products.pickProjectPlaceholder')}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {formatIdrProjectLabel(project)}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                </div>

                <IdrCatalogPanel projectId={catalogProjectId} />

              </>

            ) : (

              <AdminNotice>{t('admin:products.catalogNeedSecret')}</AdminNotice>

            )}

          </AppShellCardBody>

        </AppShellCard>

      ) : null}



      {activeTab === 'bind' ? (

        <AppShellCard className="border-border shadow-none">

          <AppShellCardHeader

            className="px-4 py-3"

            title={t('admin:products.bindTitle')}

            description={t('admin:products.bindDesc')}

          />

          <AppShellCardBody className="px-4 py-3">

            {loading ? (

              <Skeleton className="h-32 w-full rounded-lg" />

            ) : paidPlans.length === 0 ? (

              <p className="text-sm text-muted-foreground">{t('admin:products.noPaidPlans')}</p>

            ) : (

              <div className="overflow-x-auto rounded-xl border border-border">

                <table className={cn(adminTableClass, 'min-w-[720px]')}>

                  <thead className="border-b border-border bg-muted/40 text-muted-foreground">

                    <tr>

                      <th className={adminTableHeadClass}>{t('admin:products.colName')}</th>

                      <th className={adminTableHeadClass}>{t('admin:products.colPayReady')}</th>

                      <th className={adminTableHeadClass} colSpan={2}>

                        {t('admin:products.pickProject')} / {t('admin:products.pickSku')}

                      </th>

                      <th className={adminTableHeadClass}>{t('admin:products.colActions')}</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-border">

                    {paidPlans.map((plan) => {

                      const draft = planBindings[plan.id] ?? { projectId: null, skuId: null }

                      return (

                        <tr key={plan.id} className="align-top hover:bg-muted/20">

                          <td className={adminTableCellClass}>

                            <p className="font-medium">{plan.name}</p>

                            <p className="font-mono text-xs text-muted-foreground">

                              {plan.code} · {formatPlanPrice(plan.priceCents)}

                            </p>

                          </td>

                          <td className={adminTableCellClass}>

                            <span

                              className={cn(

                                'inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase',

                                plan.paymentReady

                                  ? 'bg-emerald-100 text-emerald-900'

                                  : 'bg-amber-100 text-amber-900',

                              )}

                            >

                              {plan.paymentReady

                                ? t('admin:plans.paymentReady')

                                : t('admin:plans.paymentNotReady')}

                            </span>

                          </td>

                          <td className={cn(adminTableCellClass, 'min-w-[280px]')} colSpan={2}>

                            <IdrProjectSkuPicker

                              autoLoad={canUseCatalog}

                              projectId={draft.projectId}

                              skuId={draft.skuId}

                              disabled={!canUseCatalog}

                              compact

                              onProjectChange={(pid) =>

                                setPlanBindings((prev) => ({

                                  ...prev,

                                  [plan.id]: { projectId: pid, skuId: null },

                                }))

                              }

                              onSkuChange={(sid) =>

                                setPlanBindings((prev) => ({

                                  ...prev,

                                  [plan.id]: { ...prev[plan.id], skuId: sid },

                                }))

                              }

                            />

                          </td>

                          <td className={adminTableCellClass}>

                            <AdminButton

                              disabled={!canUseCatalog || bindingPlanId === plan.id}

                              onClick={() => void handleBindPlan(plan)}

                            >

                              {bindingPlanId === plan.id

                                ? t('admin:products.binding')

                                : t('admin:products.bindSave')}

                            </AdminButton>

                          </td>

                        </tr>

                      )

                    })}

                  </tbody>

                </table>

              </div>

            )}

          </AppShellCardBody>

        </AppShellCard>

      ) : null}

    </AdminDataPage>

  )

}



function SetupForm({

  t,

  enabled,

  setEnabled,

  merchantSecret,

  setMerchantSecret,

  baseUrl,

  setBaseUrl,

  publicBaseUrl,

  setPublicBaseUrl,

  defaultPayMethod,

  setDefaultPayMethod,

  locale,

  setLocale,

  settings,

  saving,

  testing,

  onSave,

  onTest,

}: {

  t: (key: string, opts?: Record<string, unknown>) => string

  enabled: boolean

  setEnabled: (v: boolean) => void

  merchantSecret: string

  setMerchantSecret: (v: string) => void

  baseUrl: string

  setBaseUrl: (v: string) => void

  publicBaseUrl: string

  setPublicBaseUrl: (v: string) => void

  defaultPayMethod: string

  setDefaultPayMethod: (v: string) => void

  locale: string

  setLocale: (v: string) => void

  settings: AdminPaymentSettings | null

  saving: boolean

  testing: boolean

  onSave: () => void

  onTest: () => void

}) {

  return (

    <div className="space-y-5">

      <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-5 py-4">

        <span className="text-sm font-medium">{t('admin:products.fieldEnabled')}</span>

        <Switch checked={enabled} onCheckedChange={setEnabled} />

      </label>



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <AdminField layout="form" label={t('admin:products.fieldMerchantSecret')}>

          <AdminTextInput

            type="password"

            value={merchantSecret}

            onChange={(e) => setMerchantSecret(e.target.value)}

            placeholder={

              settings?.merchantSecretSet

                ? t('admin:products.secretPlaceholderKeep')

                : t('admin:products.secretPlaceholderNew')

            }

          />

        </AdminField>

        <AdminField layout="form" label={t('admin:products.fieldBaseUrl')}>

          <AdminTextInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://open.idatariver.com" />

        </AdminField>

        <AdminField layout="form" label={t('admin:products.fieldPublicBaseUrl')}>

          <AdminTextInput value={publicBaseUrl} onChange={(e) => setPublicBaseUrl(e.target.value)} placeholder="https://www.novel-agent.cn" />

        </AdminField>

        <AdminField layout="form" label={t('admin:products.fieldWebhook')}>

          <AdminTextInput value={settings?.webhookUrl ?? ''} readOnly className="font-mono text-xs" />

        </AdminField>

        <AdminField layout="form" label={t('admin:products.fieldPayMethod')}>

          <AdminTextInput value={defaultPayMethod} onChange={(e) => setDefaultPayMethod(e.target.value)} />

        </AdminField>

        <AdminField layout="form" label={t('admin:products.fieldLocale')}>

          <AdminTextInput value={locale} onChange={(e) => setLocale(e.target.value)} />

        </AdminField>

      </div>



      <AdminFormActions bordered={false} className="pt-2">

        <AdminButton onClick={onSave} disabled={saving}>

          <Save className="size-4" />

          {saving ? t('admin:products.saving') : t('admin:products.save')}

        </AdminButton>

        <AdminButtonOutline onClick={onTest} disabled={testing}>

          <Zap className="size-4" />

          {testing ? t('admin:products.testing') : t('admin:products.test')}

        </AdminButtonOutline>

      </AdminFormActions>

    </div>

  )

}

