package com.novel.agent.content.dto;

public record NovelDescriptionPromptRequest(
    String title,
    String genre,
    String style,
    String draft
) {}
