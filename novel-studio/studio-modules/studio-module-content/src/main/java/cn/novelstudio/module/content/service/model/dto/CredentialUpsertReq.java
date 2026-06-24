package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

@Data
public class CredentialUpsertReq {

    private String label;
    private String provider;
    private String protocol;
    private String baseUrl;
    private String apiKey;
}
