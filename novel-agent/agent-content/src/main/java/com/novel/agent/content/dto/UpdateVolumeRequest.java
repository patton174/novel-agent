package com.novel.agent.content.dto;

public record UpdateVolumeRequest(
    String title,
    String description,
    Integer sortOrder
) {}
