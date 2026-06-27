package cn.novelstudio.module.content.dto;

public record CoverPromptRequest(
    String draft,
    String styleDraft,
    String sceneDraft,
    String mode
) {}
