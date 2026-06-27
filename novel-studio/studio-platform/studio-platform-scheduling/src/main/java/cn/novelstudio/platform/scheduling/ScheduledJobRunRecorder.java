package cn.novelstudio.platform.scheduling;

/**
 * 定时任务运行历史持久化钩子；worker 模块提供 JPA 实现，未注册时跳过记录。
 */
public interface ScheduledJobRunRecorder {

    enum TriggerType {
        SCHEDULED,
        MANUAL
    }

    enum Status {
        RUNNING,
        SUCCESS,
        FAILED
    }

    long recordStart(String jobId, TriggerType triggerType, String instanceId);

    void recordSuccess(long runId);

    void recordFailure(long runId, String errorMessage);
}
