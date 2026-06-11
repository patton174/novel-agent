package cn.novelstudio.module.content.service.crawl.dto;

import java.util.List;

public record CrawlLogsResponse(
    List<CrawlLogEntryDTO> logs,
    long maxSeq
) {}
