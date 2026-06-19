package cn.novelstudio.module.auth.service.auth.resp;

import java.util.Map;

public record PixelAvatarPrefsResp(
    String style,
    String presetId,
    Map<String, String> customColors
) {}
