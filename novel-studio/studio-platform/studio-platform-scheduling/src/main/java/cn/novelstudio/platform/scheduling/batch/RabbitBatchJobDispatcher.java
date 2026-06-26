package cn.novelstudio.platform.scheduling.batch;

import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnBean(IMessageProducer.class)
@RequiredArgsConstructor
public class RabbitBatchJobDispatcher implements BatchJobDispatcher {

    private final IMessageProducer producer;

    @Override
    public void dispatch(BatchJobEnvelope envelope) {
        producer.send(MqTopic.BATCH_JOB, envelope);
    }
}
