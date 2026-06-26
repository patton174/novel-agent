import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAdminPaymentSettings, type AdminPaymentSettings } from '@/api/billingAdminApi'
import { fetchIdrProjects, type IdrProjectItem } from '@/api/idrAdminApi'
import { appToast } from '@/stores/appToastStore'

export function useAdminIdrProjectPicker() {
  const { t } = useTranslation(['admin'])
  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null)
  const [projects, setProjects] = useState<IdrProjectItem[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const canUseCatalog = Boolean(settings?.merchantSecretSet)

  const loadProjects = useCallback(async () => {
    if (!canUseCatalog) {
      setProjects([])
      return
    }
    try {
      setProjects(await fetchIdrProjects())
    } catch {
      setProjects([])
    }
  }, [canUseCatalog])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const paymentSettings = await fetchAdminPaymentSettings()
      setSettings(paymentSettings)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects, settings?.merchantSecretSet])

  return {
    settings,
    projects,
    projectId,
    setProjectId,
    loading,
    canUseCatalog,
    refresh: load,
  }
}
