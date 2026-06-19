package com.novel.agent.pyai.service.biz;

import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.pyai.dto.agent.SessionTitleRequest;
import com.novel.agent.pyai.dto.agent.SessionTitleResponse;
import com.novel.agent.pyai.service.PythonSessionTitleClient;
import org.springframework.stereotype.Component;

@Component
public class AgentSessionBiz extends BaseBiz {

    private final PythonSessionTitleClient titleClient;

    public AgentSessionBiz(PythonSessionTitleClient titleClient) {
        this.titleClient = titleClient;
    }

    public SessionTitleResponse generateTitle(SessionTitleRequest request) {
        String title = titleClient.generateTitle(
            request.userMessage(),
            request.assistantSnippet() == null ? "" : request.assistantSnippet(),
            request.novelTitle() == null ? "" : request.novelTitle()
        );
        if (title == null || title.isBlank()) {
            title = fallbackTitle(request.userMessage());
        }
        return new SessionTitleResponse(title);
    }

    private static String fallbackTitle(String userMessage) {
        String clean = userMessage == null ? "" : userMessage.trim().replaceAll("\\s+", " ");
        if (clean.isBlank()) {
            return "新对话";
        }
        if (clean.length() > 18) {
            return clean.substring(0, 18) + "…";
        }
        return clean;
    }
}
