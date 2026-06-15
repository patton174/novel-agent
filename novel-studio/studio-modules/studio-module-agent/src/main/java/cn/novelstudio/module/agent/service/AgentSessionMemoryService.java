package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.dto.AppendMessageRequest;
import cn.novelstudio.module.content.dto.ContentMessageDTO;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.dto.UpsertSessionRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthContentSessionBiz;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AgentSessionMemoryService {

    private static final int DEFAULT_LIMIT = 24;

    private final AuthContentSessionBiz sessionBiz;

    public AgentSessionMemoryService(AuthContentSessionBiz sessionBiz) {
        this.sessionBiz = sessionBiz;
    }

    public List<HistoryTurn> loadHistory(Long userId, String sessionId, int limit) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return List.of();
        }
        try {
            int effectiveLimit = limit > 0 ? limit : DEFAULT_LIMIT;
            Result<List<ContentMessageDTO>> result = sessionBiz.listMessages(
                String.valueOf(userId),
                sessionId,
                effectiveLimit
            );
            List<ContentMessageDTO> items = result == null ? null : result.data();
            if (items == null || items.isEmpty()) {
                return List.of();
            }
            List<HistoryTurn> turns = new ArrayList<>();
            for (ContentMessageDTO item : items) {
                HistoryTurn turn = parseMessage(item);
                if (turn != null) {
                    turns.add(turn);
                }
            }
            return turns;
        } catch (Exception ex) {
            return List.of();
        }
    }

    public String getSessionTitle(Long userId, String sessionId) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return "新对话";
        }
        try {
            Result<SessionDTO> result = sessionBiz.get(String.valueOf(userId), sessionId);
            SessionDTO session = result == null ? null : result.data();
            if (session == null || session.title() == null) {
                return "新对话";
            }
            String title = session.title().trim();
            return title.isBlank() ? "新对话" : title;
        } catch (Exception ex) {
            return "新对话";
        }
    }

    public boolean isSessionOwnedByUser(Long userId, String sessionId) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return false;
        }
        try {
            Result<List<SessionDTO>> result = sessionBiz.list(String.valueOf(userId), 200);
            List<SessionDTO> sessions = result == null ? null : result.data();
            if (sessions == null) {
                return false;
            }
            return sessions.stream().anyMatch(s -> sessionId.equals(s.id()));
        } catch (Exception ex) {
            return false;
        }
    }

    public void ensureSession(Long userId, String sessionId, String seedTitle) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return;
        }
        try {
            String novelId = resolveExistingNovelId(userId, sessionId);
            sessionBiz.upsert(
                String.valueOf(userId),
                new UpsertSessionRequest(sessionId, inferTitle(seedTitle), novelId)
            );
        } catch (Exception ignored) {
            // best effort
        }
    }

    private String resolveExistingNovelId(Long userId, String sessionId) {
        try {
            Result<SessionDTO> result = sessionBiz.get(String.valueOf(userId), sessionId);
            SessionDTO session = result == null ? null : result.data();
            return session == null ? null : session.novelId();
        } catch (Exception ex) {
            return null;
        }
    }

    public void appendTurns(Long userId, String sessionId, String userMessage, String assistantMessage) {
        // 迁移到 content + MQ 异步持久化后，此方法保留以兼容旧调用，不再直接写 Redis。
    }

    private String inferTitle(String content) {
        if (content == null || content.isBlank()) {
            return "新对话";
        }
        String clean = content.replaceAll("\\s+", " ").trim();
        return clean.length() > 18 ? clean.substring(0, 18) + "..." : clean;
    }

    private HistoryTurn parseMessage(ContentMessageDTO item) {
        if (item == null) {
            return null;
        }
        HistoryTurn turn = new HistoryTurn(item.role(), item.content());
        return turn.isValid() ? turn : null;
    }

    public record HistoryTurn(String role, String content) {
        public HistoryTurn {
            role = role == null ? "" : role.trim();
            content = content == null ? "" : content.trim();
        }

        public boolean isValid() {
            return ("user".equals(role) || "assistant".equals(role)) && !content.isBlank();
        }
    }
}
