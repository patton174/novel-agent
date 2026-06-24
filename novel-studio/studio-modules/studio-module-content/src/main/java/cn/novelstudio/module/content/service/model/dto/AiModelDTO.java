package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class AiModelDTO {

    private String id;
    private String code;
    private String displayName;
    private String modelType;
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String credentialId;
    private String credentialLabel;
    private String apiKeyMasked;
    private Integer maxTokens;
    private Double temperature;
    private Long inputPricePer1kMicros;
    private Long outputPricePer1kMicros;
    private BigDecimal priceMultiplier;
    private Boolean active;
    private Boolean isDefault;
    private Integer sortOrder;
    private String description;
    private List<String> planCodes;
}
