package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.agent.dto.agent.SessionTitleRequest;
import cn.novelstudio.module.agent.dto.agent.SessionTitleResponse;
import cn.novelstudio.module.agent.service.PythonSessionTitleClient;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.springframework.stereotype.Component;

@Component
public class AgentSessionBiz extends BaseBiz {

    private final PythonSessionTitleClient titleClient;
    private final StudioMessages messages;

    public AgentSessionBiz(PythonSessionTitleClient titleClient, StudioMessages messages) {
        this.titleClient = titleClient;
        this.messages = messages;
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

    private String fallbackTitle(String userMessage) {
        String clean = userMessage == null ? "" : userMessage.trim().replaceAll("\\s+", " ");
        if (clean.isBlank()) {
            return messages.get("content.session.default_title");
        }
        if (clean.length() > 18) {
            return clean.substring(0, 18) + "…";
        }
        return clean;
    }
}
