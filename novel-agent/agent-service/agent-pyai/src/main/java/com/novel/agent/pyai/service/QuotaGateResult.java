package com.novel.agent.pyai.service;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.pyai.dto.billing.QuotaCheckResp;

public record QuotaGateResult(QuotaCheckResp quota) {

    public String quotaWarningHeader() {
        if (quota == null || !quota.quotaWarning()) {
            return null;
        }
        return "token:" + String.format("%.2f", quota.percentUsed() / 100.0);
    }
}
