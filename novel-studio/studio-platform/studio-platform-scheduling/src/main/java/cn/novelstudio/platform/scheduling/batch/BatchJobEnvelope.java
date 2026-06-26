package cn.novelstudio.platform.scheduling.batch;

import java.util.List;
import java.util.Map;

/** 异步批量任务 MQ 信封。 */
public record BatchJobEnvelope(
    String jobType,
    String batchId,
    List<String> itemIds,
    Map<String, String> attributes
) {
}
