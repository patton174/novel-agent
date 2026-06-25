package cn.novelstudio.module.billing.dto;

public record PaymentSettingsResp(
    boolean enabled,
    boolean configured,
    boolean merchantSecretSet,
    String merchantSecretMasked,
    String baseUrl,
    String projectId,
    String publicBaseUrl,
    String defaultPayMethod,
    String locale,
    String webhookUrl,
    String docsUrl
) {
}
