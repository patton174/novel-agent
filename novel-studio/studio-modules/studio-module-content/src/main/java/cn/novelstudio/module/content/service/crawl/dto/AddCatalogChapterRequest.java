package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AddCatalogChapterRequest(
    @NotBlank(message = "{validation.content.title_required}") String title,
    String content,
    @Min(value = 1, message = "{validation.number.min_one}") int sortOrder,
    String sourceUrl
) {}
