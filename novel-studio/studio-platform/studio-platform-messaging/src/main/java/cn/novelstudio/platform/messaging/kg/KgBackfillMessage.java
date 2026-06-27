package cn.novelstudio.platform.messaging.kg;

public record KgBackfillMessage(
    String novelId,
    Long userId
) {}
