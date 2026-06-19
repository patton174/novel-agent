package com.novel.agent.pyai.service;

import com.novel.agent.pyai.client.BillingInternalClient;
import com.novel.agent.pyai.dto.billing.QuotaCheckResp;
import com.novel.agent.pyai.support.BlockingWebSupport;
import org.springframework.stereotype.Service;

@Service
public class QuotaGateService {

    private final BillingInternalClient billingInternalClient;
    private final BlockingWebSupport blockingWebSupport;

    public QuotaGateService(BillingInternalClient billingInternalClient, BlockingWebSupport blockingWebSupport) {
        this.billingInternalClient = billingInternalClient;
        this.blockingWebSupport = blockingWebSupport;
    }

    public QuotaGateResult assertCanStartRun(long userId) {
        QuotaCheckResp quota = blockingWebSupport.call(() -> billingInternalClient.assertRunQuota(userId));
        return new QuotaGateResult(quota);
    }
}
