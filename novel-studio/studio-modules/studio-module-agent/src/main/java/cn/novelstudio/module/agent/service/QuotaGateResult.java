package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.billing.dto.QuotaCheckResp;

public record QuotaGateResult(QuotaCheckResp quota) {

    public String quotaWarningHeader() {
        if (quota == null || !quota.quotaWarning()) {
            return null;
        }
        return "token:" + String.format("%.2f", quota.percentUsed() / 100.0);
    }
}
