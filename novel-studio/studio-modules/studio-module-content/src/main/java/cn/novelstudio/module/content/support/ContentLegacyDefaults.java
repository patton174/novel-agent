package cn.novelstudio.module.content.support;

/**
 * 识别 DB/Redis 中遗留的默认标题（中英文），读取时替换为当前 Locale 的 MessageSource 文案。
 */
public final class ContentLegacyDefaults {

    private static final String LEGACY_SESSION_ZH = "新对话";
    private static final String LEGACY_SESSION_EN = "New chat";
    private static final String LEGACY_SESSION_ALT_ZH = "新会话";
    private static final String LEGACY_SESSION_ALT_EN = "New session";
    private static final String LEGACY_SESSION_UNNAMED_ZH = "未命名对话";
    private static final String LEGACY_SESSION_UNNAMED_EN = "Untitled chat";
    private static final String LEGACY_SESSION_GENERATING_ZH = "生成标题…";
    private static final String LEGACY_SESSION_GENERATING_EN = "Generating title…";
    private static final String LEGACY_VOLUME_ZH = "第一卷";
    private static final String LEGACY_VOLUME_EN = "Volume 1";

    private ContentLegacyDefaults() {
    }

    public static boolean isBlankOrLegacySessionTitle(String title) {
        if (title == null || title.isBlank()) {
            return true;
        }
        String trimmed = title.trim();
        return LEGACY_SESSION_ZH.equals(trimmed) || LEGACY_SESSION_EN.equalsIgnoreCase(trimmed);
    }

    /** 含占位/待生成标题（Agent 会话标题规则）。 */
    public static boolean isPlaceholderSessionTitle(String title) {
        if (isBlankOrLegacySessionTitle(title)) {
            return true;
        }
        String trimmed = title.trim();
        return LEGACY_SESSION_ALT_ZH.equals(trimmed)
            || LEGACY_SESSION_ALT_EN.equalsIgnoreCase(trimmed)
            || LEGACY_SESSION_UNNAMED_ZH.equals(trimmed)
            || LEGACY_SESSION_UNNAMED_EN.equalsIgnoreCase(trimmed)
            || LEGACY_SESSION_GENERATING_ZH.equals(trimmed)
            || LEGACY_SESSION_GENERATING_EN.equalsIgnoreCase(trimmed)
            || "Generating title...".equalsIgnoreCase(trimmed);
    }

    public static boolean isBlankOrLegacyVolumeTitle(String title) {
        if (title == null || title.isBlank()) {
            return true;
        }
        String trimmed = title.trim();
        return LEGACY_VOLUME_ZH.equals(trimmed) || LEGACY_VOLUME_EN.equalsIgnoreCase(trimmed);
    }
}
