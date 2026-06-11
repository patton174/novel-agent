package cn.novelstudio.module.content.service.crawl.dto;

import java.util.List;

/** 主编排 Agent 启动时注入的书库快照（避免 LLM 盲派任务）。 */
public record CatalogOverviewDTO(
    long totalNovels,
    long missingCoverCount,
    List<CatalogNovelProgressDTO> missingCover,
    List<CatalogNovelProgressDTO> incomplete,
    List<CatalogNovelProgressDTO> recentNovels
) {}
