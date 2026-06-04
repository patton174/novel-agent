package com.novel.agent.pyai.service;

final class SessionTitleRules {

    private SessionTitleRules() {}

    static boolean needsGeneratedTitle(String title) {
        if (title == null || title.isBlank()) {
            return true;
        }
        String t = title.trim();
        return "新对话".equals(t) || "新会话".equals(t) || "未命名对话".equals(t) || "生成标题…".equals(t);
    }
}
