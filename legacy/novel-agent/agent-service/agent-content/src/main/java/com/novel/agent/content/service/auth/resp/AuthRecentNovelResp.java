package com.novel.agent.content.service.auth.resp;

public record AuthRecentNovelResp(
    String novelId,
    String title,
    String lastChapterId,
    String coverUrl,
    long updatedAt
) {}
