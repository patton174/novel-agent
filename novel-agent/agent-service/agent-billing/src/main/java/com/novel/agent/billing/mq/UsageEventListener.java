package com.novel.agent.billing.mq;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.billing.dto.UsageReportRequest;
import com.novel.agent.billing.service.biz.UsageReportBiz;
import com.novel.agent.common.mq.constant.MqTopic;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UsageEventListener {

    private static final Logger log = LoggerFactory.getLogger(UsageEventListener.class);

    private final UsageReportBiz usageReportBiz;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "agent.usage.queue")
    public void onUsageReport(String message) {
        try {
            UsageReportRequest request = objectMapper.readValue(message, UsageReportRequest.class);
            usageReportBiz.persistReport(request);
        } catch (Exception ex) {
            log.error("处理 usage 上报失败: {}", message, ex);
        }
    }
}
