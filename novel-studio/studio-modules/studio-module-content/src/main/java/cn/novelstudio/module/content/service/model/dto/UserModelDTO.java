package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

@Data
public class UserModelDTO {

    private String id;
    private String modelType;
    private String publicModelId;
    private AiModelDTO publicModel;
    private String label;
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String credentialId;
    private String credentialLabel;
    private Boolean byok;
    private Boolean isDefault;
}
