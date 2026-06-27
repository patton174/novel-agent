package cn.novelstudio.module.content.dto;

public record GenerateCoverRequest(
    String prompt,
    String stylePrompt,
    String scenePrompt
) {}
