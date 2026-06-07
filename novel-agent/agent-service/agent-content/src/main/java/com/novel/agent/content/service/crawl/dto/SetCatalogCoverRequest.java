package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record SetCatalogCoverRequest(
    @NotBlank String coverUrl
) {}
