package com.novel.agent.pyai.controller;

import com.novel.agent.pyai.dto.agent.SessionTitleRequest;
import com.novel.agent.pyai.dto.agent.SessionTitleResponse;
import com.novel.agent.pyai.service.PythonSessionTitleClient;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent/session")
public class AgentSessionController {

    private final PythonSessionTitleClient titleClient;

    public AgentSessionController(PythonSessionTitleClient titleClient) {
        this.titleClient = titleClient;
    }

    @PostMapping("/title")
    public SessionTitleResponse generateTitle(@Valid @RequestBody SessionTitleRequest request) {
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
