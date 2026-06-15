package com.novel.agent.pyai.service;

import java.util.regex.Pattern;

final class SessionTitleRules {

    private static final Pattern[] BOILERPLATE_TITLE_PATTERNS = {
        Pattern.compile("^我整理好了上下文"),
        Pattern.compile("^Read:\\s*#", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^\\{'signature'"),
        Pattern.compile("^\\*\\*删除完成"),
    };

    private SessionTitleRules() {}

    static boolean needsGeneratedTitle(String title) {
        if (title == null || title.isBlank()) {
            return true;
        }
        String t = title.trim();
        if ("新对话".equals(t) || "新会话".equals(t) || "未命名对话".equals(t) || "生成标题…".equals(t)) {
            return true;
        }
        for (Pattern pattern : BOILERPLATE_TITLE_PATTERNS) {
            if (pattern.matcher(t).find()) {
                return true;
            }
        }
        return false;
    }
}
