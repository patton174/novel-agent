package cn.novelstudio.module.worker.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;

/**
 * worker 模块统一业务异常工厂。
 */
public final class WorkerExceptions {

    private WorkerExceptions() {}

    public static ValidationException jobTypeRequired() {
        return ValidationException.keyed("batch.job_type_required");
    }

    public static ValidationException itemIdsRequired() {
        return ValidationException.keyed("batch.item_ids_required");
    }

    public static ValidationException unknownJobType(String jobType) {
        return ValidationException.keyed("batch.unknown_job_type", jobType);
    }

    public static ValidationException mqUnavailable() {
        return ValidationException.keyed(ResultCode.BAD_REQUEST, "batch.mq_unavailable");
    }

    public static ValidationException unknownJobId(String jobId) {
        return ValidationException.keyed("jobs.unknown_job_id", jobId);
    }
}
