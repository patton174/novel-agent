package com.novel.agent.billing.dto;

public record PublicSiteSettingsResp(
    boolean registrationEnabled,
    boolean registrationRequireEmailVerify
) {
}
