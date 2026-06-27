package cn.novelstudio.module.content.service.auth.resp;

public record AuthRecentNovelResp(
    String novelId,
    String title,
    String lastChapterId,
    String coverUrl,
    String coverStorageKey,
    boolean hasCover,
    long updatedAt
) {}
