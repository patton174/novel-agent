package cn.novelstudio.platform.scheduling;

/**
 * 平台定时任务契约：由 {@link StudioJobRegistrar} 统一注册，
 * 经 {@link StudioJobRunner} 加 Redis 分布式锁后执行。
 */
public interface StudioScheduledJob {

    /** 全局唯一任务 ID，用于分布式锁键。 */
    String jobId();

    /** 首次延迟（毫秒）。 */
    default long initialDelayMs() {
        return 60_000;
    }

    /** 固定间隔（毫秒）。 */
    default long fixedDelayMs() {
        return 120_000;
    }

    void run() throws Exception;
}
