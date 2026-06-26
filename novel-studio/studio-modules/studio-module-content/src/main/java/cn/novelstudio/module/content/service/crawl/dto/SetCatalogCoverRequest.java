package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record SetCatalogCoverRequest(
    @NotBlank(message = "{validation.crawl.cover_url_required}") String coverUrl
) {}
