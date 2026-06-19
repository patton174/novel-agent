package cn.novelstudio.module.auth.service.auth.req;

import java.util.Map;

public record PixelAvatarPrefsReq(
    String style,
    String presetId,
    Map<String, String> customColors
) {}
