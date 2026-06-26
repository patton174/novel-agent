package cn.novelstudio.module.upload.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class UploadRuntimeProperties {

    @Value("${agent.internal.service-key:dev-internal-key-change-me}")
    private String internalServiceKey;

    public String internalServiceKey() {
        return internalServiceKey;
    }
}
