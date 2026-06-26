export type SystemJobKind = 'cron' | 'daemon' | 'mq' | 'deploy'

export interface SystemJobCatalogItem {
  id: string
  labelKey: string
  descKey: string
  kind: SystemJobKind
  scheduleKey?: string
  docHintKey?: string
}

/** JVM 外运维任务（静态目录，不与 runtime API 重复） */
export const EXTERNAL_OPS_JOBS_CATALOG: SystemJobCatalogItem[] = [
  {
    id: 'frontend-crypto-register',
    labelKey: 'admin:jobs.catalog.frontendCrypto.name',
    descKey: 'admin:jobs.catalog.frontendCrypto.desc',
    kind: 'deploy',
    scheduleKey: 'admin:jobs.catalog.frontendCrypto.schedule',
    docHintKey: 'admin:jobs.catalog.frontendCrypto.hint',
  },
  {
    id: 'crawl-orchestrator',
    labelKey: 'admin:jobs.catalog.crawlOrchestrator.name',
    descKey: 'admin:jobs.catalog.crawlOrchestrator.desc',
    kind: 'daemon',
    docHintKey: 'admin:jobs.catalog.crawlOrchestrator.hint',
  },
  {
    id: 'deploy-pipeline',
    labelKey: 'admin:jobs.catalog.deployPipeline.name',
    descKey: 'admin:jobs.catalog.deployPipeline.desc',
    kind: 'deploy',
    scheduleKey: 'admin:jobs.catalog.deployPipeline.schedule',
  },
]

export const SYSTEM_JOB_KIND_LABEL: Record<SystemJobKind, string> = {
  cron: 'admin:jobs.kindCron',
  daemon: 'admin:jobs.kindDaemon',
  mq: 'admin:jobs.kindMq',
  deploy: 'admin:jobs.kindDeploy',
}

/** 分布式定时 jobId → i18n */
export const SCHEDULED_JOB_I18N: Record<string, { labelKey: string; descKey: string }> = {
  'upload-parse-reaper': {
    labelKey: 'admin:jobs.runtime.uploadParseReaper.name',
    descKey: 'admin:jobs.runtime.uploadParseReaper.desc',
  },
  'payment-idatariver-config-refresh': {
    labelKey: 'admin:jobs.runtime.idrConfigRefresh.name',
    descKey: 'admin:jobs.runtime.idrConfigRefresh.desc',
  },
  'site-settings-cache-refresh': {
    labelKey: 'admin:jobs.runtime.siteSettingsRefresh.name',
    descKey: 'admin:jobs.runtime.siteSettingsRefresh.desc',
  },
  'agent-run-proxy-heartbeat': {
    labelKey: 'admin:jobs.runtime.agentRunProxy.name',
    descKey: 'admin:jobs.runtime.agentRunProxy.desc',
  },
}

/** MQ consumer id（API 返回小写 enum 名）→ i18n */
export const MQ_CONSUMER_I18N: Record<string, { labelKey: string; descKey: string }> = {
  permission: {
    labelKey: 'admin:jobs.mq.permission.name',
    descKey: 'admin:jobs.mq.permission.desc',
  },
  agent_session: {
    labelKey: 'admin:jobs.catalog.agentSession.name',
    descKey: 'admin:jobs.catalog.agentSession.desc',
  },
  story_memory: {
    labelKey: 'admin:jobs.catalog.storyMemory.name',
    descKey: 'admin:jobs.catalog.storyMemory.desc',
  },
  agent_run_events: {
    labelKey: 'admin:jobs.mq.agentRunEvents.name',
    descKey: 'admin:jobs.mq.agentRunEvents.desc',
  },
  crawl_dispatch: {
    labelKey: 'admin:jobs.catalog.crawlDispatch.name',
    descKey: 'admin:jobs.catalog.crawlDispatch.desc',
  },
  catalog_index: {
    labelKey: 'admin:jobs.mq.catalogIndex.name',
    descKey: 'admin:jobs.mq.catalogIndex.desc',
  },
  usage_event: {
    labelKey: 'admin:jobs.mq.usageEvent.name',
    descKey: 'admin:jobs.mq.usageEvent.desc',
  },
  file_parse: {
    labelKey: 'admin:jobs.mq.fileParse.name',
    descKey: 'admin:jobs.mq.fileParse.desc',
  },
  batch_job: {
    labelKey: 'admin:jobs.mq.batchJob.name',
    descKey: 'admin:jobs.mq.batchJob.desc',
  },
}

/** batch jobType → i18n */
export const BATCH_JOB_I18N: Record<string, { labelKey: string; descKey: string }> = {
  'upload.parse.retry': {
    labelKey: 'admin:jobs.batch.uploadParseRetry.name',
    descKey: 'admin:jobs.batch.uploadParseRetry.desc',
  },
}
