package cn.novelstudio.platform.scheduling.batch;

/** 将批量任务投递到 MQ，由 worker 异步分片执行。 */
public interface BatchJobDispatcher {

    void dispatch(BatchJobEnvelope envelope);
}
