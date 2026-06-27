package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.agent.dto.agent.SessionTitleRequest;
import cn.novelstudio.module.agent.dto.agent.SessionTitleResponse;
import cn.novelstudio.module.agent.service.PythonSessionTitleClient;
import cn.novelstudio.module.agent.support.AgentLocaleMarkers;
import org.springframework.stereotype.Component;

@Component
public class AgentSessionBiz extends BaseBiz {

    private final PythonSessionTitleClient titleClient;
    private final AgentLocaleMarkers localeMarkers;

    public AgentSessionBiz(PythonSessionTitleClient titleClient, AgentLocaleMarkers localeMarkers) {
        this.titleClient = titleClient;
        this.localeMarkers = localeMarkers;
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
        return localeMarkers.truncateSessionTitle(userMessage);
    }
}
