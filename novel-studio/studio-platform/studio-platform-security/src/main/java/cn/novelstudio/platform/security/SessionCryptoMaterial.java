package cn.novelstudio.platform.security;

public record SessionCryptoMaterial(
    String keyId,
    String aesKeyB64,
    int keyVersion,
    long expiresAtEpochMs
) {
}
