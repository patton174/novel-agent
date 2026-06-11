package cn.novelstudio.module.content.dto;

public record UpdateChapterRequest(
    String title,
    String content,
    String summary,
    Integer sortOrder
) {}
