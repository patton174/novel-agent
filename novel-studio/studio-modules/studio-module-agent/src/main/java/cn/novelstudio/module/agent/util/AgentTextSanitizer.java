package cn.novelstudio.module.agent.util;

/**
 * 助手正文清理：去掉 think / UI 痕迹，保留段落换行。
 */
public final class AgentTextSanitizer {

    /** Last-resort when Spring i18n is unavailable (matches messages_en agent.text.ui_line_labels). */
    private static final String DEFAULT_UI_LINE_LABELS = "Thinking|Tool call|Skill call|Writing body";

    private AgentTextSanitizer() {
    }

    public static String sanitizeAssistantVisibleText(String raw) {
        return sanitizeAssistantVisibleText(raw, DEFAULT_UI_LINE_LABELS);
    }

    public static String sanitizeAssistantVisibleText(String raw, String uiLineLabelAlternation) {
        if (raw == null) {
            return "";
        }
        String labels = uiLineLabelAlternation == null || uiLineLabelAlternation.isBlank()
            ? DEFAULT_UI_LINE_LABELS
            : uiLineLabelAlternation;
        String clean = raw
            .replaceAll("(?is)<think>.*?</think>", "")
            .replaceAll("(?im)^(" + labels + ").*?$", "")
            .replace("\uFFFD", "");
        clean = clean.replaceAll("[ \t\f\r\u00a0\u3000]{2,}", " ");
        clean = clean.replaceAll("\n{3,}", "\n\n");
        return clean.strip();
    }
}
