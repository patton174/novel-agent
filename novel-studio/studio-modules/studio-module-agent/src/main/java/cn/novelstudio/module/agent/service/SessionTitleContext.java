package cn.novelstudio.module.agent.service;

import java.util.Map;

final class SessionTitleContext {

    private SessionTitleContext() {}

    static String extractNovelTitle(Map<String, Object> assembledContext) {
        if (assembledContext == null || assembledContext.isEmpty()) {
            return "";
        }
        Object project = assembledContext.get("project");
        if (!(project instanceof Map<?, ?> projectMap)) {
            return "";
        }
        Object title = projectMap.get("title");
        if (title == null) {
            title = projectMap.get("name");
        }
        return title == null ? "" : String.valueOf(title);
    }
}
