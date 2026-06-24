import { useCallback, useEffect, useState } from 'react'
import { fetchDefaultModel, setDefaultModel } from '@/api/modelApi'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { ModelSelector } from '@/components/model/ModelSelector'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useTranslation } from 'react-i18next'
import { appToast } from '@/stores/appToastStore'
import { MODEL_PIXEL_ROW } from '@/lib/modelPixelClasses'

/** 个性设置：主题 + 语言 + 默认模型，桌面/移动设置页共用。 */
export function PersonalSettingsRows() {
  const { t } = useTranslation(['dashboard'])
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [defaultReady, setDefaultReady] = useState(false)
  const [modelSelectorKey, setModelSelectorKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDefaultModel('llm')
      .then((model) => {
        if (cancelled) return
        if (!model) {
          setDefaultModelId(null)
          return
        }
        if (model.publicModelId) {
          setDefaultModelId(`pub:${model.publicModelId}`)
        } else {
          setDefaultModelId(model.id)
        }
      })
      .catch(() => {
        if (!cancelled) setDefaultModelId(null)
      })
      .finally(() => {
        if (!cancelled) setDefaultReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDefaultModelChange = useCallback(async (value: string | null) => {
    if (!value) {
      setDefaultModelId(null)
      return
    }
    try {
      await setDefaultModel('llm', value)
      setDefaultModelId(value)
      setModelSelectorKey((k) => k + 1)
      appToast.success(t('dashboard:model.defaultSaved'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:model.defaultSaveFailed'))
    }
  }, [t])

  return (
    <div className="space-y-3">
      <div className={MODEL_PIXEL_ROW}>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold uppercase text-foreground">
            {t('dashboard:settings.uiTheme')}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{t('dashboard:settings.themeHint')}</p>
        </div>
        <ThemeToggle className="shrink-0" />
      </div>
      <div className={MODEL_PIXEL_ROW}>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold uppercase text-foreground">
            {t('dashboard:settings.uiLanguage')}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{t('dashboard:settings.languageHint')}</p>
        </div>
        <LocaleToggle className="shrink-0" />
      </div>
      <div className={MODEL_PIXEL_ROW}>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold uppercase text-foreground">
            {t('dashboard:model.defaultTitle')}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{t('dashboard:model.defaultDesc')}</p>
        </div>
        {defaultReady ? (
          <ModelSelector
            key={modelSelectorKey}
            value={defaultModelId}
            onChange={(v) => void handleDefaultModelChange(v)}
            className="shrink-0"
          />
        ) : null}
      </div>
    </div>
  )
}
