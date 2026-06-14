package cn.novelstudio.module.content.dto;

public record NovelDescriptionPromptRequest(
    String title,
    String genre,
    String style,
    String draft
) {}
