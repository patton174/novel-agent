package cn.novelstudio.module.content.dto;

public record UpdateVolumeRequest(
    String title,
    String description,
    Integer sortOrder
) {}
