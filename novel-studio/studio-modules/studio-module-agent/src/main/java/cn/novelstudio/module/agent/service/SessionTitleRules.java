package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.content.support.ContentLegacyDefaults;

import java.util.regex.Pattern;

final class SessionTitleRules {

    private static final Pattern[] BOILERPLATE_TITLE_PATTERNS = {
        Pattern.compile("^我整理好了上下文"),
        Pattern.compile("^I('ve| have) organized the context", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^Read:\\s*#", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^\\{'signature'"),
        Pattern.compile("^\\*\\*删除完成"),
        Pattern.compile("^\\*\\*Deletion complete", Pattern.CASE_INSENSITIVE),
    };

    private SessionTitleRules() {}

    static boolean needsGeneratedTitle(String title) {
        if (ContentLegacyDefaults.isPlaceholderSessionTitle(title)) {
            return true;
        }
        if (title == null || title.isBlank()) {
            return true;
        }
        String t = title.trim();
        for (Pattern pattern : BOILERPLATE_TITLE_PATTERNS) {
            if (pattern.matcher(t).find()) {
                return true;
            }
        }
        return false;
    }
}
