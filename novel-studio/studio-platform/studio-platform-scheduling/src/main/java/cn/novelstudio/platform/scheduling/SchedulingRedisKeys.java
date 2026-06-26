package cn.novelstudio.platform.scheduling;

/** 平台定时任务 Redis 键前缀。 */
public final class SchedulingRedisKeys {

    public static final String JOB_LOCK_PREFIX = "studio:job:lock:";

    private SchedulingRedisKeys() {
    }
}
