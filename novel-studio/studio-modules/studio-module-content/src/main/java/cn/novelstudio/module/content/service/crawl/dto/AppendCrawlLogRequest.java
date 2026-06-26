package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.NotBlank;

public record AppendCrawlLogRequest(
    @NotBlank(message = "{validation.crawl.log_level_required}") String level,
    @NotBlank(message = "{validation.crawl.log_message_required}") String message
) {}
