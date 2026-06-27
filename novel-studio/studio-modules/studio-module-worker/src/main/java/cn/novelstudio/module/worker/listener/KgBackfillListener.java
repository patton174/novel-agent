package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.content.service.KgBackfillService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.kg.KgBackfillMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class KgBackfillListener {

    private static final Logger log = LoggerFactory.getLogger(KgBackfillListener.class);

    private final ObjectMapper objectMapper;
    private final KgBackfillService backfillService;

    public KgBackfillListener(ObjectMapper objectMapper, KgBackfillService backfillService) {
        this.objectMapper = objectMapper;
        this.backfillService = backfillService;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.kg.backfill.queue", durable = "true"))
    public void onBackfill(String message) {
        MqListenerSupport.safeHandle(log, message, "kg.backfill failed", this::handle);
    }

    private void handle(String message) throws Exception {
        KgBackfillMessage payload = objectMapper.readValue(message, KgBackfillMessage.class);
        backfillService.backfill(payload.novelId());
    }
}
