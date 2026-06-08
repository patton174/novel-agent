package com.novel.agent.pyai.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.pyai.config.AgentRuntimeProperties;
import com.novel.agent.pyai.dto.billing.QuotaCheckResp;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Component
public class BillingInternalClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final RestClient billingRestClient;
    private final AgentRuntimeProperties runtimeProperties;
    private final IMessageProducer messageProducer;
    private final ObjectMapper objectMapper;

    public BillingInternalClient(
        @Qualifier("billingRestClient") RestClient billingRestClient,
        AgentRuntimeProperties runtimeProperties,
        IMessageProducer messageProducer,
        ObjectMapper objectMapper
    ) {
        this.billingRestClient = billingRestClient;
        this.runtimeProperties = runtimeProperties;
        this.messageProducer = messageProducer;
        this.objectMapper = objectMapper;
    }

    public QuotaCheckResp assertRunQuota(long userId) {
        if (!runtimeProperties.billingEnabled()) {
            return null;
        }
        try {
            Result<QuotaCheckResp> result = billingRestClient.post()
                .uri("/internal/billing/quota/assert-run?userId={userId}", userId)
                .header(INTERNAL_KEY_HEADER, runtimeProperties.internalServiceKey())
                .retrieve()
                .body(new TypeReference<Result<QuotaCheckResp>>() {});
            return result != null ? result.data() : null;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 402) {
                throw BizException.of(ResultCode.BILLING_QUOTA_EXCEEDED, "本月配额已用尽");
            }
            throw ex;
        }
    }

    public void publishUsageReport(Map<String, Object> payload) {
        if (!runtimeProperties.billingEnabled()) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(payload);
            messageProducer.send(MqTopic.USAGE_EVENT, json);
        } catch (Exception ex) {
            // 计量失败不阻断 Agent 主路径
            org.slf4j.LoggerFactory.getLogger(BillingInternalClient.class)
                .warn("usage report publish failed: {}", ex.getMessage());
        }
    }

    public void persistUsageReportDirect(Map<String, Object> payload) {
        if (!runtimeProperties.billingEnabled()) {
            return;
        }
        billingRestClient.post()
            .uri("/internal/billing/usage/report")
            .contentType(MediaType.APPLICATION_JSON)
            .header(INTERNAL_KEY_HEADER, runtimeProperties.internalServiceKey())
            .body(payload)
            .retrieve()
            .toBodilessEntity();
    }
}
