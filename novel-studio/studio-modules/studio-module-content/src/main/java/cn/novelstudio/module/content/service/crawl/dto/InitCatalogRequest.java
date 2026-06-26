package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record InitCatalogRequest(
    @NotBlank(message = "{validation.content.title_required}") String title,
    String author,
    String description,
    String sourceUrl
) {}
