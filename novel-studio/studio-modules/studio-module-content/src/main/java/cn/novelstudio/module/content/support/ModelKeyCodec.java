package cn.novelstudio.module.content.support;

import cn.novelstudio.platform.security.AesGcmCodec;
import org.springframework.stereotype.Component;

@Component
public class ModelKeyCodec {

    private final AesGcmCodec codec;

    public ModelKeyCodec(AesGcmCodec modelKeyAesCodec) {
        this.codec = modelKeyAesCodec;
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }
        return codec.encryptToBase64(plaintext);
    }

    public String decrypt(String ciphertextB64) {
        if (ciphertextB64 == null || ciphertextB64.isEmpty()) {
            return ciphertextB64;
        }
        try {
            return codec.decryptFromBase64(ciphertextB64);
        } catch (Exception e) {
            throw new IllegalStateException("model.api_key_decrypt_failed", e);
        }
    }
}
