package cn.novelstudio.platform.messaging.library;

public record LibraryIndexMessage(
    String catalogNovelId,
    Long userId,
    String namespace
) {}
