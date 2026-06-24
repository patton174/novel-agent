package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

@Data
public class ByokUpsertReq {

    /** 复用已有 API 连接时填写 */
    private String credentialId;
    /** 新建连接时的连接名称（可选，默认同模型 label） */
    private String credentialLabel;
    private String label;
    private String modelType;
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String apiKey;
}
