package com.novel.agent.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record AppendCrawlLogRequest(
    @NotBlank String level,
    @NotBlank String message
) {}
