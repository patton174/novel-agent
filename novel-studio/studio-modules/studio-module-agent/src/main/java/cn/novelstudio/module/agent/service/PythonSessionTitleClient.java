package cn.novelstudio.module.agent.service;

import java.util.Map;

public interface PythonSessionTitleClient {
    String generateTitle(String userMessage, String assistantSnippet, String novelTitle);
}
