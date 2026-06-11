package cn.novelstudio.module.agent.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.billing.dto.QuotaCheckResp;
import cn.novelstudio.module.billing.dto.UsageReportRequest;
import cn.novelstudio.module.billing.service.biz.QuotaBiz;
import cn.novelstudio.module.billing.service.biz.UsageReportBiz;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class BillingInternalClient {

    private static final Logger log = LoggerFactory.getLogger(BillingInternalClient.class);

    private final AgentRuntimeProperties runtimeProperties;
    private final QuotaBiz quotaBiz;
    private final UsageReportBiz usageReportBiz;
    private final IMessageProducer messageProducer;
    private final ObjectMapper objectMapper;

    public BillingInternalClient(
        AgentRuntimeProperties runtimeProperties,
        QuotaBiz quotaBiz,
        UsageReportBiz usageReportBiz,
        IMessageProducer messageProducer,
        ObjectMapper objectMapper
    ) {
        this.runtimeProperties = runtimeProperties;
        this.quotaBiz = quotaBiz;
        this.usageReportBiz = usageReportBiz;
        this.messageProducer = messageProducer;
        this.objectMapper = objectMapper;
    }

    public QuotaCheckResp assertRunQuota(long userId) {
        if (!runtimeProperties.billingEnabled()) {
            return null;
        }
        return quotaBiz.checkAndReserveRun(userId);
    }

    public void publishUsageReport(Map<String, Object> payload) {
        if (!runtimeProperties.billingEnabled()) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(payload);
            messageProducer.send(MqTopic.USAGE_EVENT, json);
        } catch (Exception ex) {
            log.warn("usage report publish failed: {}", ex.getMessage());
        }
    }

    public void persistUsageReportDirect(Map<String, Object> payload) {
        if (!runtimeProperties.billingEnabled()) {
            return;
        }
        usageReportBiz.persistReport(objectMapper.convertValue(payload, UsageReportRequest.class));
    }
}
