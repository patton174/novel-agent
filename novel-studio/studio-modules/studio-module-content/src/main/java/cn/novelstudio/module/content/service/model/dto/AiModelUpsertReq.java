package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AiModelUpsertReq {

    private String code;
    private String displayName;
    private String modelType;
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String credentialId;
    private String credentialLabel;
    private String apiKey;
    private Integer maxTokens;
    private Double temperature;
    private Long inputPricePer1kMicros;
    private Long outputPricePer1kMicros;
    private BigDecimal priceMultiplier;
    private Boolean active;
    private Integer sortOrder;
    private String description;
}
