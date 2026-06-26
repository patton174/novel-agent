package cn.novelstudio.module.upload.batch;

import cn.novelstudio.platform.scheduling.batch.BatchJobEnvelope;

/** 批量任务分片处理器（按 jobType 路由）。 */
public interface BatchJobHandler {

    /** 唯一 jobType，与 {@link cn.novelstudio.platform.scheduling.batch.BatchJobEnvelope#jobType()} 对应。 */
    String jobType();

    default boolean supports(String type) {
        return jobType().equals(type);
    }

    void handle(BatchJobEnvelope envelope) throws Exception;
}
