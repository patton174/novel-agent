import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Loader2, Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
import { useAvailableModels } from '@/hooks/useAvailableModels'
import { cn } from '@/lib/utils'
import {
  buildModelOptions,
  filterModelOptions,
  findModelOption,
  type ModelOption,
} from '@/utils/modelSelection'
import {
  MODEL_PIXEL_DROPDOWN,
  MODEL_PIXEL_GROUP_LABEL,
  MODEL_PIXEL_SEARCH_ROW,
  MODEL_PIXEL_TRIGGER,
  modelPixelChipClass,
  modelPixelPickerRowClass,
} from '@/lib/modelPixelClasses'

interface ModelSelectorProps {
  value?: string | null
  onChange: (userModelId: string | null) => void
  type?: string
  compact?: boolean
  disabled?: boolean
  className?: string
  /** 会话级覆盖时显示角标 */
  showSessionBadge?: boolean
}

function ModelPickerRow({
  option,
  selected,
  onSelect,
}: {
  option: ModelOption
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation(['dashboard'])

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={modelPixelPickerRowClass(selected)}
    >
      <ModelProviderIcon provider={option.provider} label={option.label} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-mono text-xs font-bold text-foreground">{option.label}</span>
          {option.kind === 'byok' ? (
            <span className={cn(modelPixelChipClass(false), 'shrink-0 py-px text-[9px]')}>
              {t('dashboard:model.byokBadge')}
            </span>
          ) : null}
          {option.isDefaultPublic ? (
            <span className={cn(modelPixelChipClass(true), 'shrink-0 py-px text-[9px]')}>
              {t('dashboard:model.defaultShort')}
            </span>
          ) : null}
          {option.multiplier ? (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              ×{option.multiplier}
            </span>
          ) : null}
        </span>
        {option.subtitle ? (
          <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
            {option.subtitle}
          </span>
        ) : null}
      </span>
      {selected ? (
        <Check className="size-3.5 shrink-0 text-foreground" strokeWidth={3} />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
    </button>
  )
}

/** 模型切换器：分组下拉 + 提供商图标 + 搜索 */
export function ModelSelector({
  value,
  onChange,
  type = 'llm',
  compact = false,
  disabled = false,
  className,
  showSessionBadge = false,
}: ModelSelectorProps) {
  const { t } = useTranslation(['dashboard', 'editor'])
  const { data, loading, failed, empty } = useAvailableModels(type)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const labels = {
    platformDefault: t('dashboard:model.platformDefault'),
    defaultSubtitle: t('dashboard:model.defaultSubtitle'),
  }
  const current = findModelOption(value, data, labels)
  const options = buildModelOptions(data, labels)
  const filtered = useMemo(() => filterModelOptions(options, search), [options, search])

  const publicOptions = filtered.filter((o) => o.kind === 'public')
  const byokOptions = filtered.filter((o) => o.kind === 'byok')
  const defaultOption = filtered.find((o) => o.kind === 'default')
  const showSearch = options.length > 4

  const selectedValue = value ?? ''
  const isSessionOverride = showSessionBadge && value != null && value !== ''

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <DropdownMenuTrigger asChild disabled={disabled || loading}>
        <button
          type="button"
          data-testid="model-selector-trigger"
          aria-label={t('editor:chat.modelLabel')}
          title={failed ? t('editor:chat.modelLoadFailed') : t('editor:chat.modelLabel')}
          className={cn(
            MODEL_PIXEL_TRIGGER,
            compact
              ? 'h-8 max-w-[11rem] px-1.5 text-[11px] normal-case'
              : 'h-9 min-w-[12rem] max-w-full px-2 text-sm normal-case',
            className,
          )}
        >
          {loading ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <ModelProviderIcon provider={current.provider} label={current.label} size="sm" />
          )}
          <span className="min-w-0 flex-1 truncate text-left normal-case">
            {loading ? t('editor:chat.modelLoading') : current.label}
          </span>
          {isSessionOverride ? (
            <span
              className="absolute -right-0.5 -top-0.5 size-2 border border-black bg-neon"
              title={t('dashboard:model.sessionOverride')}
            />
          ) : null}
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={cn(MODEL_PIXEL_DROPDOWN, 'w-[min(20rem,calc(100vw-2rem))]')}
      >
        {showSearch ? (
          <div className={MODEL_PIXEL_SEARCH_ROW}>
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard:model.searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}

        {failed ? (
          <p className="px-2 py-2 font-mono text-[11px] text-destructive">
            {t('editor:chat.modelLoadFailed')}
          </p>
        ) : null}
        {empty && !loading && !failed ? (
          <p className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
            {t('editor:chat.modelEmpty')}
          </p>
        ) : null}

        {filtered.length === 0 && search.trim() ? (
          <p className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
            {t('dashboard:model.searchEmpty')}
          </p>
        ) : null}

        {defaultOption ? (
          <ModelPickerRow
            option={defaultOption}
            selected={selectedValue === ''}
            onSelect={() => {
              onChange(null)
              setOpen(false)
            }}
          />
        ) : null}

        {publicOptions.length ? (
          <>
            <DropdownMenuSeparator className="my-1 bg-black/15" />
            <DropdownMenuLabel className={MODEL_PIXEL_GROUP_LABEL}>
              {t('dashboard:model.public')}
            </DropdownMenuLabel>
            {publicOptions.map((option) => (
              <ModelPickerRow
                key={option.value}
                option={option}
                selected={selectedValue === option.value}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              />
            ))}
          </>
        ) : null}

        {byokOptions.length ? (
          <>
            <DropdownMenuSeparator className="my-1 bg-black/15" />
            <DropdownMenuLabel className={MODEL_PIXEL_GROUP_LABEL}>
              {t('dashboard:model.byokTitle')}
            </DropdownMenuLabel>
            {byokOptions.map((option) => (
              <ModelPickerRow
                key={option.value}
                option={option}
                selected={selectedValue === option.value}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              />
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator className="my-1 bg-black/15" />
        <Link
          to="/dashboard/settings#api-models"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-2 px-2 py-2 font-mono text-[11px] font-bold uppercase text-primary transition-colors hover:bg-neon/25"
        >
          <Plus className="size-3.5 shrink-0" />
          <span>{t('dashboard:model.manageCredentials')}</span>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
