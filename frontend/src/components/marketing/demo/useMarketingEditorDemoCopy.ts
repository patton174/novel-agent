import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export type DemoToolRow = {
  name: string
  args: string
  status: 'idle' | 'loading' | 'success'
  excerpt: string
}

export type DemoChapter = { idx: string; title: string; active: boolean }

export function useMarketingEditorDemoCopy() {
  const { t, i18n } = useTranslation('marketing')

  return useMemo(() => {
    const labels = t('demo.editor.labels', { returnObjects: true }) as Record<string, string>
    const novel = t('demo.editor.novel', { returnObjects: true }) as { title: string; meta: string }
    const chapters = t('demo.editor.chapters', { returnObjects: true }) as DemoChapter[]
    const editorPrior = t('demo.editor.editorPrior', { returnObjects: true }) as string[]
    const editorStream = t('demo.editor.editorStream', { returnObjects: true }) as string[]
    const thinkLines = t('demo.editor.thinkLines', { returnObjects: true }) as string[]
    const orchTools = t('demo.editor.orchTools', { returnObjects: true }) as DemoToolRow[]
    const subagentTools = t('demo.editor.subagentTools', { returnObjects: true }) as DemoToolRow[]

    return {
      ariaLabel: t('demo.editor.ariaLabel'),
      novel,
      chapters,
      editorPrior,
      editorStream,
      thinkLines,
      orchTools,
      subagentTools,
      streamTail: t('demo.editor.streamTail'),
      editorTail: t('demo.editor.editorTail'),
      labels,
      userPrompt: t('demo.editor.userPrompt'),
      composerPlaceholder: t('demo.editor.composerPlaceholder'),
      browserUrl: t('demo.editor.browserUrl'),
      planTool: t('demo.editor.planTool'),
      waitingVariants: t('demo.editor.waitingVariants', { returnObjects: true }) as {
        orchestrate: string
        default: string
      },
    }
  }, [t, i18n.language])
}
