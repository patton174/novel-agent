package cn.novelstudio.module.agent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class SessionTitleService {

    private static final Logger log = LoggerFactory.getLogger(SessionTitleService.class);

    private final PythonSessionTitleClient titleClient;
    private final AgentSessionMemoryService sessionMemoryService;

    public SessionTitleService(
        PythonSessionTitleClient titleClient,
        AgentSessionMemoryService sessionMemoryService
    ) {
        this.titleClient = titleClient;
        this.sessionMemoryService = sessionMemoryService;
    }

    public void maybeGenerateTitleAsync(
        Long userId,
        String sessionId,
        String userMessage,
        String assistantSnippet,
        String novelTitle
    ) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return;
        }
        String seed = userMessage == null ? "" : userMessage.trim();
        if (seed.isBlank()) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            try {
                String current = sessionMemoryService.getSessionTitle(userId, sessionId);
                if (!SessionTitleRules.needsGeneratedTitle(current)) {
                    return;
                }
                String title = titleClient.generateTitle(seed, assistantSnippet, novelTitle);
                if (title == null || title.isBlank()) {
                    return;
                }
                sessionMemoryService.ensureSession(userId, sessionId, title);
                log.info("会话标题已生成 userId={}, sessionId={}, title={}", userId, sessionId, title);
            } catch (Exception ex) {
                log.warn("生成会话标题失败 sessionId={}: {}", sessionId, ex.getMessage());
            }
        });
    }
}
