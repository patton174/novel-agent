package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.repository.agent.AgentSkillRepository;
import cn.novelstudio.module.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AgentSkillService {

    private static final Logger log = LoggerFactory.getLogger(AgentSkillService.class);

    private static final Pattern NAME_SLUG = Pattern.compile("^[a-z0-9-]{2,64}$");
    private static final int MAX_CONTENT_LEN = 32_768;
    private static final int MAX_RUN_SKILLS = 3;

    private final AgentSkillRepository repository;

    public List<AgentSkillDTO> listForUser(Long userId) {
        return repository.findByUserIdOrIsSystemTrueOrderByNameAsc(userId).stream()
            .map(row -> toDto(row, false))
            .toList();
    }

    public AgentSkillDTO getForUser(Long userId, UUID id) {
        AgentSkillEntity entity = requireReadable(userId, id);
        return toDto(entity, true);
    }

    @Transactional
    public AgentSkillDTO create(Long userId, CreateAgentSkillRequest req) {
        String name = normalizeName(req.name());
        validateNameSlug(name);
        if (repository.findByNameAndUserId(name, userId).isPresent()) {
            throw ValidationException.keyed("agent.skill.name_taken", name);
        }
        String content = sanitizeContent(requireContent(req.content()));
        validateContentLength(content);
        List<String> tools = normalizeTools(req.tools());

        AgentSkillEntity entity = new AgentSkillEntity();
        entity.setUserId(userId);
        entity.setName(name);
        entity.setVersion(1);
        entity.setDescription(trimToNull(req.description()));
        entity.setContent(content);
        entity.setToolsJson(tools);
        entity.setLocale(normalizeLocale(req.locale()));
        entity.setIsSystem(false);
        return toDto(repository.save(entity), true);
    }

    @Transactional
    public AgentSkillDTO update(Long userId, UUID id, UpdateAgentSkillRequest req) {
        AgentSkillEntity entity = repository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> skillNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.skill.system_readonly");
        }
        if (entity.getVersion() == null || entity.getVersion() != req.version()) {
            throw new BizException(409, "agent.skill.version_mismatch");
        }

        String content = sanitizeContent(requireContent(req.content()));
        validateContentLength(content);

        entity.setDescription(trimToNull(req.description()));
        entity.setContent(content);
        entity.setToolsJson(normalizeTools(req.tools()));
        entity.setLocale(normalizeLocale(req.locale()));
        entity.setVersion(entity.getVersion() + 1);
        return toDto(repository.save(entity), true);
    }

    @Transactional
    public void delete(Long userId, UUID id) {
        AgentSkillEntity entity = repository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> skillNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.skill.system_readonly");
        }
        entity.setDeletedAt(Instant.now());
        repository.save(entity);
    }

    public List<AgentSkillEntity> getForRun(Long userId, List<String> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) {
            return List.of();
        }
        List<AgentSkillEntity> resolved = new ArrayList<>();
        for (String idOrSlug : skillIds.stream().limit(MAX_RUN_SKILLS).toList()) {
            if (idOrSlug == null || idOrSlug.isBlank()) {
                continue;
            }
            Optional<AgentSkillEntity> skill = resolveForRun(userId, idOrSlug.trim());
            if (skill.isPresent()) {
                resolved.add(skill.get());
            } else {
                log.warn("agent skill skipped: no access or not found idOrSlug={} userId={}", idOrSlug, userId);
            }
        }
        return resolved;
    }

    public List<AgentSkillEntity> listSystemSkills() {
        return repository.findByIsSystemTrueOrderByNameAsc();
    }

    static String sanitizeContent(String content) {
        if (content == null) {
            return "";
        }
        return content.replaceAll("(?i)<script", "");
    }

    private Optional<AgentSkillEntity> resolveForRun(Long userId, String idOrSlug) {
        try {
            UUID id = UUID.fromString(idOrSlug);
            Optional<AgentSkillEntity> byId = repository.findById(id);
            if (byId.isEmpty()) {
                return Optional.empty();
            }
            AgentSkillEntity entity = byId.get();
            if (Boolean.TRUE.equals(entity.getIsSystem()) || Objects.equals(entity.getUserId(), userId)) {
                return Optional.of(entity);
            }
            return Optional.empty();
        } catch (IllegalArgumentException ignored) {
            // not a UUID — resolve by slug
        }
        Optional<AgentSkillEntity> system = repository.findByNameAndIsSystemTrue(idOrSlug);
        if (system.isPresent()) {
            return system;
        }
        return repository.findByNameAndUserId(idOrSlug, userId);
    }

    private AgentSkillEntity requireReadable(Long userId, UUID id) {
        AgentSkillEntity entity = repository.findById(id)
            .orElseThrow(() -> skillNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem()) || Objects.equals(entity.getUserId(), userId)) {
            return entity;
        }
        throw ContentExceptions.badRequest("agent.skill.forbidden");
    }

    private static NotFoundException skillNotFound(UUID id) {
        return NotFoundException.keyed("agent.skill.not_found", id);
    }

    private static String normalizeName(String name) {
        if (name == null) {
            throw ContentExceptions.badRequest("agent.skill.name_required");
        }
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw ContentExceptions.badRequest("agent.skill.name_required");
        }
        return trimmed;
    }

    private static void validateNameSlug(String name) {
        if (!NAME_SLUG.matcher(name).matches()) {
            throw ContentExceptions.badRequest("agent.skill.name_invalid");
        }
    }

    private static String requireContent(String content) {
        if (content == null || content.isBlank()) {
            throw ContentExceptions.badRequest("agent.skill.content_required");
        }
        return content.trim();
    }

    private static void validateContentLength(String content) {
        if (content.length() > MAX_CONTENT_LEN) {
            throw ContentExceptions.badRequest("agent.skill.content_too_large");
        }
    }

    private static List<String> normalizeTools(List<String> tools) {
        if (tools == null) {
            return List.of();
        }
        return tools.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    private static String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            return "zh";
        }
        return locale.trim();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static AgentSkillDTO toDto(AgentSkillEntity entity, boolean includeContent) {
        List<String> tools = entity.getToolsJson() == null ? List.of() : List.copyOf(entity.getToolsJson());
        return new AgentSkillDTO(
            entity.getId(),
            entity.getName(),
            entity.getDescription(),
            entity.getLocale(),
            Boolean.TRUE.equals(entity.getIsSystem()),
            tools,
            entity.getVersion() == null ? 1 : entity.getVersion(),
            includeContent ? entity.getContent() : null
        );
    }
}
