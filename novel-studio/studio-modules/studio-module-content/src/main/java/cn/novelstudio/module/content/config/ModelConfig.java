package cn.novelstudio.module.content.config;

import cn.novelstudio.platform.security.AesGcmCodec;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.model")
public class ModelConfig {

    /** 必填，base64 编码的 32 字节 AES 密钥；空则启动失败。 */
    private String keyEncryptionKey;

    @Bean
    AesGcmCodec modelKeyAesCodec() {
        if (keyEncryptionKey == null || keyEncryptionKey.isBlank()) {
            throw new IllegalStateException("app.model.key-encryption-key 未配置（MODEL_KEY_ENCRYPTION_KEY）");
        }
        return AesGcmCodec.fromBase64Key(keyEncryptionKey);
    }
}
