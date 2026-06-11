package cn.novelstudio.module.content.dto;

public record SessionDTO(
    String id,
    String title,
    long updatedAt,
    String novelId
) {}
