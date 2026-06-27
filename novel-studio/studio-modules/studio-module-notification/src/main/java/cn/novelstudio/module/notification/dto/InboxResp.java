package cn.novelstudio.module.notification.dto;

import java.util.List;

public record InboxResp(
    List<NotificationItemResp> list,
    boolean hasMore,
    Long nextCursor
) {}
