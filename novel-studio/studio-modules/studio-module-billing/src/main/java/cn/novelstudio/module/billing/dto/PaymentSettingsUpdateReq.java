package cn.novelstudio.module.billing.dto;

public record PaymentSettingsUpdateReq(
    Boolean enabled,
    String baseUrl,
    String merchantSecret,
    String projectId,
    String publicBaseUrl,
    String defaultPayMethod,
    String locale
) {
}
