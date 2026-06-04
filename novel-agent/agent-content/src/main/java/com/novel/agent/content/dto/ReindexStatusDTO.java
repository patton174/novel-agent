package com.novel.agent.content.dto;

public record ReindexStatusDTO(
    boolean ok,
    String status,
    String novelId,
    int chapters,
    int indexed,
    int processed,
    String error,
    long startedAt,
    Long finishedAt
) {}
