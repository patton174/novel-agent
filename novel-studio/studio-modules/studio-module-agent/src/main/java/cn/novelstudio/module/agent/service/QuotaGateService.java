package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.client.BillingInternalClient;
import cn.novelstudio.module.billing.dto.QuotaCheckResp;
import org.springframework.stereotype.Service;

@Service
public class QuotaGateService {

    private final BillingInternalClient billingInternalClient;

    public QuotaGateService(BillingInternalClient billingInternalClient) {
        this.billingInternalClient = billingInternalClient;
    }

    public QuotaGateResult assertCanStartRun(long userId) {
        QuotaCheckResp quota = billingInternalClient.assertRunQuota(userId);
        return new QuotaGateResult(quota);
    }
}
