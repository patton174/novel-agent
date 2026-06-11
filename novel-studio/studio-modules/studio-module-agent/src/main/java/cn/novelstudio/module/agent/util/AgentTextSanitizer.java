package cn.novelstudio.module.agent.util;

/**
 * 助手正文清理：去掉 think / UI 痕迹，保留段落换行。
 */
public final class AgentTextSanitizer {

    private AgentTextSanitizer() {
    }

    public static String sanitizeAssistantVisibleText(String raw) {
        if (raw == null) {
            return "";
        }
        String clean = raw
            .replaceAll("(?is)<think>.*?</think>", "")
            .replaceAll("(?im)^(思考过程|工具调用|技能调用|撰写正文).*?$", "")
            .replace("\uFFFD", "");
        clean = clean.replaceAll("[ \t\f\r\u00a0\u3000]{2,}", " ");
        clean = clean.replaceAll("\n{3,}", "\n\n");
        return clean.strip();
    }

    /** Agent 面板默认欢迎语，不能当作章节正文。 */
    public static boolean isOnboardingAssistantText(String raw) {
        if (raw == null || raw.isBlank()) {
            return false;
        }
        String text = raw.trim();
        return text.contains("你好！当前正在创作")
            || text.contains("我已读取本书简介")
            || text.contains("描述场景、人物或情节")
            || text.contains("切换到「世界观」模式");
    }
}
