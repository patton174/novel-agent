package cn.novelstudio.platform.scheduling.batch;

import java.util.List;

/** 批量任务投递/执行历史条目（Redis 环形缓冲）。 */
public record BatchJobHistoryEntry(
    String batchId,
    String jobType,
    int itemCount,
    String phase,
    long atEpochMs,
    String detail
) {
    public static BatchJobHistoryEntry dispatched(String batchId, String jobType, int itemCount) {
        return new BatchJobHistoryEntry(batchId, jobType, itemCount, "dispatched", System.currentTimeMillis(), null);
    }

    public static BatchJobHistoryEntry completed(String batchId, String jobType, int itemCount, String detail) {
        return new BatchJobHistoryEntry(batchId, jobType, itemCount, "completed", System.currentTimeMillis(), detail);
    }

    public static BatchJobHistoryEntry failed(String batchId, String jobType, int itemCount, String detail) {
        return new BatchJobHistoryEntry(batchId, jobType, itemCount, "failed", System.currentTimeMillis(), detail);
    }
}
