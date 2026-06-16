package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.entity.agent.AgentMessageEntity;
import cn.novelstudio.module.content.entity.agent.AgentSessionEntity;
import cn.novelstudio.module.content.repository.agent.AgentMessageRepository;
import cn.novelstudio.module.content.repository.agent.AgentSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentSessionPgService {

    private final AgentSessionRepository sessionRepository;
    private final AgentMessageRepository messageRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void upsertSession(Long userId, String sessionId, String title, String novelId) {
        if (userId == null || sessionId == null || sessionId.isBlank()) {
            return;
        }
        var existing = sessionRepository.findById(sessionId);
        if (existing.isPresent()) {
            AgentSessionEntity entity = existing.get();
            applySessionFields(entity, sessionId, userId, title, novelId);
            sessionRepository.save(entity);
            return;
        }
        AgentSessionEntity entity = new AgentSessionEntity();
        applySessionFields(entity, sessionId, userId, title, novelId);
        try {
            sessionRepository.saveAndFlush(entity);
        } catch (DataIntegrityViolationException ex) {
            AgentSessionEntity raced = sessionRepository.findById(sessionId)
                .orElseThrow(() -> ex);
            applySessionFields(raced, sessionId, userId, title, novelId);
            sessionRepository.save(raced);
        }
    }

    private static void applySessionFields(
        AgentSessionEntity entity,
        String sessionId,
        Long userId,
        String title,
        String novelId
    ) {
        entity.setId(sessionId);
        entity.setUserId(userId);
        entity.setTitle(title == null || title.isBlank() ? "新对话" : title);
        if (novelId != null && !novelId.isBlank()) {
            entity.setNovelId(novelId);
        }
        entity.setStatus("active");
    }

    @Transactional(readOnly = true)
    public SessionDTO getSession(Long userId, String sessionId) {
        return sessionRepository.findById(sessionId)
            .filter(s -> userId.equals(s.getUserId()))
            .map(this::toDto)
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean isSessionOwnedByUser(Long userId, String sessionId) {
        return sessionRepository.findById(sessionId)
            .map(s -> userId.equals(s.getUserId()))
            .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<SessionDTO> listSessions(Long userId, int limit) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
            .limit(Math.max(limit, 1))
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public void appendMessage(
        Long userId,
        String sessionId,
        String messageId,
        String role,
        String content,
        String status,
        String runId
    ) {
        if (!isSessionOwnedByUser(userId, sessionId)) {
            upsertSession(userId, sessionId, "新对话", null);
        }
        AgentMessageEntity entity = messageRepository.findById(messageId).orElseGet(AgentMessageEntity::new);
        entity.setId(messageId);
        entity.setSessionId(sessionId);
        entity.setRunId(runId);
        entity.setRole(role);
        entity.setContent(content);
        entity.setStatus(status == null || status.isBlank() ? "completed" : status);
        messageRepository.save(entity);

        sessionRepository.findById(sessionId).ifPresent(session -> {
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);
        });
    }

    private SessionDTO toDto(AgentSessionEntity entity) {
        return new SessionDTO(
            entity.getId(),
            entity.getTitle(),
            entity.getUpdatedAt().toEpochMilli(),
            entity.getNovelId()
        );
    }
}
