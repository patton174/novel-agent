package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.content.dto.agent.AgentProfileDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentProfileRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentProfileRequest;
import cn.novelstudio.module.content.entity.agent.AgentProfileEntity;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.repository.agent.AgentProfileRepository;
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
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgentProfileService {

    private static final Logger log = LoggerFactory.getLogger(AgentProfileService.class);

    static final Set<String> KNOWN_AGENT_TOOLS = Set.of(
        "ListChapters", "ChapterAudit", "ReadChapter", "WriteChapter", "EditChapter",
        "DeleteChapter", "ReorderChapters", "NarrativeReview",
        "ListMemory", "GetMemoryTree", "ReadMemory", "CreateMemory",
        "UpdateMemoryFields", "UpdateMemoryContent", "UpdateMemoryMeta", "MoveMemory", "DeleteMemory",
        "SearchKnowledge", "GetCharacterGraph",
        "AskUser", "TodoWrite", "Agent",
        "WebSearch", "WebFetch",
        "ListMcpResources", "ReadMcpResource",
        "Skill"
    );

    private final AgentProfileRepository repository;
    private final AgentSkillService skillService;

    public List<AgentProfileDTO> listForUser(Long userId) {
        return repository.findByUserIdOrIsSystemTrueOrderByDisplayNameAsc(userId).stream()
            .map(this::toDto)
            .toList();
    }

    public AgentProfileDTO getForUser(Long userId, String id) {
        return toDto(requireReadable(userId, id));
    }

    public AgentProfileEntity getForRun(Long userId, String profileId) {
        return requireReadable(userId, profileId);
    }

    public Optional<AgentProfileEntity> findAccessible(Long userId, String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        String key = id.trim();
        return repository.findByIdAndIsSystemTrue(key)
            .or(() -> userId == null ? Optional.empty() : repository.findByIdAndUserId(key, userId));
    }

    @Transactional
    public AgentProfileDTO cloneSystem(Long userId, String systemId) {
        AgentProfileEntity src = repository.findByIdAndIsSystemTrue(systemId)
            .orElseThrow(() -> profileNotFound(systemId));
        AgentProfileEntity copy = new AgentProfileEntity();
        copy.setId(UUID.randomUUID().toString());
        copy.setUserId(userId);
        copy.setDisplayName(src.getDisplayName() + " (copy)");
        copy.setDescription(src.getDescription());
        copy.setSystemPromptTemplate(src.getSystemPromptTemplate());
        copy.setToolAllowlistJson(new ArrayList<>(nullSafeList(src.getToolAllowlistJson())));
        copy.setModelOverride(src.getModelOverride());
        copy.setMaxTurns(src.getMaxTurns());
        copy.setMaxOutputTokens(src.getMaxOutputTokens());
        copy.setSkillIdsJson(new ArrayList<>(nullSafeList(src.getSkillIdsJson())));
        copy.setIsSystem(false);
        return toDto(repository.save(copy));
    }

    @Transactional
    public AgentProfileDTO create(Long userId, CreateAgentProfileRequest req) {
        AgentProfileEntity entity = new AgentProfileEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setDisplayName(req.displayName().trim());
        entity.setDescription(trim(req.description()));
        entity.setSystemPromptTemplate(req.systemPromptTemplate().trim());
        entity.setToolAllowlistJson(normalizeTools(req.toolAllowlist()));
        entity.setModelOverride(trim(req.modelOverride()));
        entity.setMaxTurns(req.maxTurns() != null ? req.maxTurns() : 20);
        entity.setMaxOutputTokens(req.maxOutputTokens());
        entity.setSkillIdsJson(normalizeIds(req.skillIds()));
        entity.setIsSystem(false);
        return toDto(repository.save(entity));
    }

    @Transactional
    public AgentProfileDTO update(Long userId, String id, UpdateAgentProfileRequest req) {
        AgentProfileEntity entity = repository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> profileNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.profile.system_readonly");
        }
        entity.setDisplayName(req.displayName().trim());
        entity.setDescription(trim(req.description()));
        entity.setSystemPromptTemplate(req.systemPromptTemplate().trim());
        entity.setToolAllowlistJson(normalizeTools(req.toolAllowlist()));
        entity.setModelOverride(trim(req.modelOverride()));
        if (req.maxTurns() != null) {
            entity.setMaxTurns(req.maxTurns());
        }
        entity.setMaxOutputTokens(req.maxOutputTokens());
        entity.setSkillIdsJson(normalizeIds(req.skillIds()));
        return toDto(repository.save(entity));
    }

    @Transactional
    public void delete(Long userId, String id) {
        AgentProfileEntity entity = repository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> profileNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.profile.system_readonly");
        }
        entity.setDeletedAt(Instant.now());
        repository.save(entity);
    }

    /**
     * Empty allowlist means unrestricted (null). Non-empty lists are filtered to known tools.
     */
    public List<String> resolveToolAllowlist(AgentProfileEntity profile) {
        List<String> allowlist = nullSafeList(profile.getToolAllowlistJson());
        if (allowlist.isEmpty()) {
            return null;
        }
        List<String> resolved = allowlist.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .filter(KNOWN_AGENT_TOOLS::contains)
            .toList();
        for (String tool : allowlist) {
            if (tool != null && !tool.isBlank() && !KNOWN_AGENT_TOOLS.contains(tool.trim())) {
                log.warn("agent profile tool skipped: unknown tool={} profileId={}", tool, profile.getId());
            }
        }
        return resolved.isEmpty() ? List.of() : resolved;
    }

    public List<AgentSkillEntity> resolveSkillIds(Long userId, AgentProfileEntity profile) {
        return skillService.getForRun(userId, nullSafeList(profile.getSkillIdsJson()));
    }

    private AgentProfileEntity requireReadable(Long userId, String id) {
        return findAccessible(userId, id).orElseThrow(() -> profileNotFound(id));
    }

    private AgentProfileDTO toDto(AgentProfileEntity e) {
        AgentProfileDTO dto = new AgentProfileDTO();
        dto.setId(e.getId());
        dto.setDisplayName(e.getDisplayName());
        dto.setDescription(e.getDescription());
        dto.setSystemPromptTemplate(e.getSystemPromptTemplate());
        dto.setToolAllowlist(nullSafeList(e.getToolAllowlistJson()));
        dto.setModelOverride(e.getModelOverride());
        dto.setMaxTurns(e.getMaxTurns());
        dto.setMaxOutputTokens(e.getMaxOutputTokens());
        dto.setSkillIds(nullSafeList(e.getSkillIdsJson()));
        dto.setIsSystem(e.getIsSystem());
        return dto;
    }

    private static List<String> normalizeTools(List<String> tools) {
        if (tools == null) {
            return new ArrayList<>();
        }
        return tools.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    private static List<String> normalizeIds(List<String> ids) {
        return normalizeTools(ids);
    }

    private static List<String> nullSafeList(List<String> list) {
        return list == null ? new ArrayList<>() : new ArrayList<>(list);
    }

    private static String trim(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static NotFoundException profileNotFound(String id) {
        return NotFoundException.keyed("agent.profile.not_found", id);
    }
}
