package com.novel.agent.content.service.auth.resp;

import java.time.Instant;

public record AuthRecentNovelResp(
    String novelId,
    String title,
    String lastChapterId,
    Instant updatedAt
) {}
