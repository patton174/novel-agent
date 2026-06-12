package cn.novelstudio.module.billing.dto;

import java.util.List;

public record SiteDanmakuPageResp(
    List<SiteDanmakuResp> list,
    boolean hasMore,
    Long nextBeforeId
) {}
