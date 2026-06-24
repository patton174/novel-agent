package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

@Data
public class ModelCredentialDTO {

    private String id;
    private String label;
    private String provider;
    private String protocol;
    private String baseUrl;
    private String apiKeyMasked;
    private int modelCount;
}
