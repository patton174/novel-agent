package cn.novelstudio.module.content.dto;

/** imagePrompt 为生图合成字段；prompt 与其相同，保留兼容旧客户端。 */
public record CoverPromptResponse(
    String stylePrompt,
    String scenePrompt,
    String document,
    String imagePrompt,
    String prompt
) {}
