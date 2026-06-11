package cn.novelstudio.module.billing.dto;

public record PublicSiteSettingsResp(
    boolean registrationEnabled,
    boolean registrationRequireEmailVerify
) {
}
