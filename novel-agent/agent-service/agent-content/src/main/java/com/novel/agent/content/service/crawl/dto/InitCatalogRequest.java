package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record InitCatalogRequest(
    @NotBlank String title,
    String author,
    String description,
    String sourceUrl
) {}
