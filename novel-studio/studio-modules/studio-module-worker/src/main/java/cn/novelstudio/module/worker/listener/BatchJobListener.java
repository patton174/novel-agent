package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.upload.batch.BatchJobHandler;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.scheduling.batch.BatchJobEnvelope;
import cn.novelstudio.platform.scheduling.batch.BatchJobHistoryEntry;
import cn.novelstudio.platform.scheduling.batch.BatchJobHistoryStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BatchJobListener {

    private static final Logger log = LoggerFactory.getLogger(BatchJobListener.class);

    private final ObjectMapper objectMapper;
    private final List<BatchJobHandler> handlers;
    private final BatchJobHistoryStore batchJobHistoryStore;

    public BatchJobListener(
        ObjectMapper objectMapper,
        List<BatchJobHandler> handlers,
        BatchJobHistoryStore batchJobHistoryStore
    ) {
        this.objectMapper = objectMapper;
        this.handlers = handlers;
        this.batchJobHistoryStore = batchJobHistoryStore;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "studio.batch.queue", durable = "true"))
    public void onBatchJob(String message) {
        MqListenerSupport.safeHandle(log, message, "batch job failed", this::handle);
    }

    private void handle(String message) throws Exception {
        BatchJobEnvelope envelope = objectMapper.readValue(message, BatchJobEnvelope.class);
        if (envelope.jobType() == null || envelope.jobType().isBlank()) {
            log.warn("batch job skipped: missing jobType batchId={}", envelope.batchId());
            return;
        }
        int itemCount = envelope.itemIds() == null ? 0 : envelope.itemIds().size();
        for (BatchJobHandler handler : handlers) {
            if (handler.supports(envelope.jobType())) {
                log.info("batch job dispatch jobType={} batchId={} items={}",
                    envelope.jobType(), envelope.batchId(), itemCount);
                try {
                    handler.handle(envelope);
                    batchJobHistoryStore.append(BatchJobHistoryEntry.completed(
                        envelope.batchId(),
                        envelope.jobType(),
                        itemCount,
                        handler.getClass().getSimpleName()
                    ));
                } catch (Exception ex) {
                    batchJobHistoryStore.append(BatchJobHistoryEntry.failed(
                        envelope.batchId(),
                        envelope.jobType(),
                        itemCount,
                        ex.getMessage()
                    ));
                    throw ex;
                }
                return;
            }
        }
        log.warn("batch job no handler for jobType={} batchId={}", envelope.jobType(), envelope.batchId());
        batchJobHistoryStore.append(BatchJobHistoryEntry.failed(
            envelope.batchId(),
            envelope.jobType(),
            itemCount,
            "no handler"
        ));
    }
}
