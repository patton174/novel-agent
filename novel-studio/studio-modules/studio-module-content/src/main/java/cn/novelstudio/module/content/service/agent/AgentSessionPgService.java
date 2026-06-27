package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.module.content.dto.ContentMessageDTO;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.entity.agent.AgentMessageEntity;
import cn.novelstudio.module.content.entity.agent.AgentSessionEntity;
import cn.novelstudio.module.content.repository.agent.AgentMessageRepository;
import cn.novelstudio.module.content.repository.agent.AgentSessionRepository;
import cn.novelstudio.module.content.support.ContentLegacyDefaults;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
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
    private final StudioMessages messages;

    /** Avoid self-invocation skipping REQUIRES_NEW on upsertSession. */
    @Lazy
    @Autowired
    private AgentSessionPgService self;

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
            AgentSessionEntity raced = loadSessionAfterInsertRace(sessionId, ex);
            applySessionFields(raced, sessionId, userId, title, novelId);
            sessionRepository.save(raced);
        }
    }

    private AgentSessionEntity loadSessionAfterInsertRace(String sessionId, DataIntegrityViolationException ex) {
        for (int attempt = 0; attempt < 6; attempt++) {
            var found = sessionRepository.findById(sessionId);
            if (found.isPresent()) {
                return found.get();
            }
            try {
                Thread.sleep(20L * (attempt + 1));
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw ex;
            }
        }
        throw ex;
    }

    private AgentMessageEntity loadMessageAfterInsertRace(String messageId, DataIntegrityViolationException ex) {
        for (int attempt = 0; attempt < 6; attempt++) {
            var found = messageRepository.findById(messageId);
            if (found.isPresent()) {
                return found.get();
            }
            try {
                Thread.sleep(20L * (attempt + 1));
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw ex;
            }
        }
        throw ex;
    }

    private void applySessionFields(
        AgentSessionEntity entity,
        String sessionId,
        Long userId,
        String title,
        String novelId
    ) {
        entity.setId(sessionId);
        entity.setUserId(userId);
        entity.setTitle(resolveSessionTitle(title));
        if (novelId != null && !novelId.isBlank()) {
            entity.setNovelId(novelId);
        }
        entity.setStatus("active");
        Instant now = Instant.now();
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(now);
        }
        entity.setUpdatedAt(now);
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
            self.upsertSession(userId, sessionId, null, null);
        }
        AgentMessageEntity entity = messageRepository.findById(messageId).orElseGet(AgentMessageEntity::new);
        entity.setId(messageId);
        entity.setSessionId(sessionId);
        entity.setRunId(runId);
        entity.setRole(role);
        entity.setContent(content);
        entity.setStatus(status == null || status.isBlank() ? "completed" : status);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(Instant.now());
        }
        try {
            messageRepository.saveAndFlush(entity);
        } catch (DataIntegrityViolationException ex) {
            AgentMessageEntity raced = loadMessageAfterInsertRace(messageId, ex);
            raced.setSessionId(sessionId);
            raced.setRunId(runId);
            raced.setRole(role);
            raced.setContent(content);
            raced.setStatus(status == null || status.isBlank() ? "completed" : status);
            if (raced.getCreatedAt() == null) {
                raced.setCreatedAt(Instant.now());
            }
            messageRepository.save(raced);
        }

        sessionRepository.findById(sessionId).ifPresent(session -> {
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);
        });
    }

    @Transactional(readOnly = true)
    public List<ContentMessageDTO> listMessagesFromPg(
        Long userId,
        String sessionId,
        int limit,
        String runIdFilter
    ) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return List.of();
        }
        if (!isSessionOwnedByUser(userId, sessionId)) {
            return List.of();
        }
        int safeLimit = Math.max(Math.min(limit, 500), 1);
        List<AgentMessageEntity> rows = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (rows.isEmpty()) {
            return List.of();
        }
        int start = Math.max(0, rows.size() - safeLimit);
        return rows.subList(start, rows.size()).stream()
            .filter(row -> runIdFilter == null || runIdFilter.isBlank() || runIdFilter.equals(row.getRunId()))
            .map(this::toContentMessageDto)
            .toList();
    }

    private ContentMessageDTO toContentMessageDto(AgentMessageEntity entity) {
        long createdAt = entity.getCreatedAt() == null ? 0L : entity.getCreatedAt().toEpochMilli();
        return new ContentMessageDTO(
            entity.getId(),
            entity.getSessionId(),
            entity.getRole(),
            entity.getContent(),
            entity.getRunId(),
            entity.getId(),
            "auto",
            createdAt,
            null
        );
    }

    private SessionDTO toDto(AgentSessionEntity entity) {
        return new SessionDTO(
            entity.getId(),
            displaySessionTitle(entity.getTitle()),
            entity.getUpdatedAt().toEpochMilli(),
            entity.getNovelId()
        );
    }

    private String resolveSessionTitle(String title) {
        if (ContentLegacyDefaults.isBlankOrLegacySessionTitle(title)) {
            return null;
        }
        return title.trim();
    }

    private String displaySessionTitle(String title) {
        if (ContentLegacyDefaults.isBlankOrLegacySessionTitle(title)) {
            return messages.get("content.session.default_title");
        }
        return title;
    }
}
