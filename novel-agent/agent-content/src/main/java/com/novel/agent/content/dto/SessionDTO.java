package com.novel.agent.content.dto;

public record SessionDTO(
    String id,
    String title,
    long updatedAt,
    String novelId
) {}
