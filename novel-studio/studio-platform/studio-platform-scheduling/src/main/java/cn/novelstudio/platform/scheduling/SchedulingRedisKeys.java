package cn.novelstudio.platform.scheduling;

/** 平台定时任务 Redis 键前缀。 */
public final class SchedulingRedisKeys {

    public static final String JOB_LOCK_PREFIX = "studio:job:lock:";

    /** Admin 保存 job 配置后广播，各实例 {@link StudioJobRegistrar#reload()}。 */
    public static final String JOBS_RELOAD_CHANNEL = "studio:jobs:reload";

    private SchedulingRedisKeys() {
    }
}
