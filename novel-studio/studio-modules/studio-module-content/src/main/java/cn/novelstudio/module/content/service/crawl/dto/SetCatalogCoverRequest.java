package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record SetCatalogCoverRequest(
    @NotBlank String coverUrl
) {}
