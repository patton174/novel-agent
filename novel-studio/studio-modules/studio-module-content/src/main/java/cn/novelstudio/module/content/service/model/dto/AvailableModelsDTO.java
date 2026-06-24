package cn.novelstudio.module.content.service.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class AvailableModelsDTO {

    private List<AiModelDTO> publicModels;
    private List<UserModelDTO> byok;
    private List<ModelCredentialDTO> credentials;
}
