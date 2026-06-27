package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRefRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.entity.agent.AgentSkillRevisionEntity;
import cn.novelstudio.module.content.entity.agent.UserSkillRefEntity;
import cn.novelstudio.module.content.repository.agent.AgentSkillRepository;
import cn.novelstudio.module.content.repository.agent.AgentSkillRevisionRepository;
import cn.novelstudio.module.content.repository.agent.UserSkillRefRepository;
import cn.novelstudio.module.content.support.AgentSkillPromptSupport;
import cn.novelstudio.module.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentSkillService {

    private static final Logger log = LoggerFactory.getLogger(AgentSkillService.class);

    private static final Pattern NAME_SLUG = Pattern.compile("^[a-z0-9-]{2,64}$");
    private static final int MAX_CONTENT_LEN = 32_768;
    private static final int MAX_RUN_SKILLS = 3;

    private final AgentSkillRepository repository;
    private final AgentSkillRevisionRepository revisionRepository;
    private final UserSkillRefRepository refRepository;

    public List<AgentSkillDTO> listForUser(Long userId) {
        return listLibraryForUser(userId);
    }

    /** Custom skills + referenced official skills (user's repository). */
    public List<AgentSkillDTO> listLibraryForUser(Long userId) {
        List<AgentSkillDTO> rows = new ArrayList<>();
        for (AgentSkillEntity custom : repository.findByUserIdOrderByNameAsc(userId)) {
            rows.add(toDtoForUser(custom, null, false));
        }
        for (UserSkillRefEntity ref : refRepository.findByUserId(userId)) {
            repository.findById(ref.getSkillId())
                .filter(e -> Boolean.TRUE.equals(e.getIsSystem()))
                .ifPresent(entity -> rows.add(toDtoForUser(entity, ref, false)));
        }
        rows.sort((a, b) -> a.name().compareToIgnoreCase(b.name()));
        return rows;
    }

    /** All official skills for browse / add reference. */
    public List<AgentSkillDTO> listOfficialCatalogForUser(Long userId) {
        List<AgentSkillEntity> system = listSystemSkills();
        Map<UUID, UserSkillRefEntity> refs = loadRefsForUser(userId, system);
        return system.stream()
            .map(row -> toDtoForUser(row, refs.get(row.getId()), false))
            .toList();
    }

    public AgentSkillDTO getForUser(Long userId, UUID id) {
        AgentSkillEntity entity = requireReadable(userId, id);
        UserSkillRefEntity ref = refFor(userId, entity);
        return toDtoForUser(entity, ref, true);
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
        entity.setEnabled(true);
        return toDtoForUser(repository.save(entity), null, true);
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
        return toDtoForUser(repository.save(entity), null, true);
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

    @Transactional
    public AgentSkillDTO ensureUserRef(Long userId, UUID skillId) {
        AgentSkillEntity entity = requireReadable(userId, skillId);
        if (!Boolean.TRUE.equals(entity.getIsSystem())) {
            return toDtoForUser(entity, null, true);
        }
        UserSkillRefEntity ref = refRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseGet(() -> createRef(userId, entity));
        return toDtoForUser(entity, ref, true);
    }

    @Transactional
    public AgentSkillDTO updateUserRef(Long userId, UUID skillId, UpdateAgentSkillRefRequest req) {
        AgentSkillEntity entity = requireReadable(userId, skillId);
        if (!Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.skill.ref_system_only");
        }
        UserSkillRefEntity ref = refRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseGet(() -> createRef(userId, entity));

        if (Boolean.TRUE.equals(req.pullLatest())) {
            int latest = latestVersion(entity);
            ref.setPinnedVersion(latest);
        }
        if (req.autoUpdate() != null) {
            ref.setAutoUpdate(req.autoUpdate());
            if (Boolean.TRUE.equals(req.autoUpdate())) {
                ref.setPinnedVersion(latestVersion(entity));
            }
        }
        if (req.enabled() != null) {
            ref.setEnabled(req.enabled());
        }
        refRepository.save(ref);
        return toDtoForUser(entity, ref, true);
    }

    @Transactional
    public void removeUserRef(Long userId, UUID skillId) {
        AgentSkillEntity entity = requireReadable(userId, skillId);
        if (!Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.skill.ref_system_only");
        }
        UserSkillRefEntity ref = refRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseThrow(() -> NotFoundException.keyed("agent.skill.ref_not_found", skillId));
        ref.setDeletedAt(Instant.now());
        refRepository.save(ref);
    }

    @Transactional
    public Optional<AgentSkillEntity> findAccessible(Long userId, String idOrSlug) {
        if (idOrSlug == null || idOrSlug.isBlank()) {
            return Optional.empty();
        }
        return resolveBase(userId, idOrSlug.trim())
            .flatMap(entity -> resolveForRunEntity(userId, entity));
    }

    @Transactional
    public List<AgentSkillEntity> getForRun(Long userId, List<String> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) {
            return List.of();
        }
        List<AgentSkillEntity> resolved = new ArrayList<>();
        for (String idOrSlug : skillIds.stream().limit(MAX_RUN_SKILLS).toList()) {
            if (idOrSlug == null || idOrSlug.isBlank()) {
                continue;
            }
            resolveBase(userId, idOrSlug.trim())
                .flatMap(entity -> resolveForRunEntity(userId, entity))
                .ifPresentOrElse(
                    resolved::add,
                    () -> log.warn(
                        "agent skill skipped: no access or not found idOrSlug={} userId={}",
                        idOrSlug,
                        userId
                    )
                );
        }
        return resolved;
    }

    /** Enabled skills in user's library — CC catalog when run has no user-picked skills. */
    @Transactional(readOnly = true)
    public List<AgentSkillEntity> listEnabledForCatalog(Long userId) {
        List<AgentSkillEntity> rows = new ArrayList<>();
        for (AgentSkillEntity custom : repository.findByUserIdOrderByNameAsc(userId)) {
            if (isEnabled(custom, null)) {
                rows.add(custom);
            }
        }
        List<UserSkillRefEntity> refs = refRepository.findByUserId(userId);
        if (refs.isEmpty()) {
            rows.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
            return rows;
        }
        List<UUID> enabledSystemIds = refs.stream()
            .filter(ref -> isEnabled(null, ref))
            .map(UserSkillRefEntity::getSkillId)
            .toList();
        if (enabledSystemIds.isEmpty()) {
            rows.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
            return rows;
        }
        Map<UUID, AgentSkillEntity> systemById = repository.findAllById(enabledSystemIds).stream()
            .filter(entity -> Boolean.TRUE.equals(entity.getIsSystem()))
            .collect(Collectors.toMap(AgentSkillEntity::getId, entity -> entity, (a, b) -> a, HashMap::new));
        for (UserSkillRefEntity ref : refs) {
            if (!isEnabled(null, ref)) {
                continue;
            }
            AgentSkillEntity entity = systemById.get(ref.getSkillId());
            if (entity == null) {
                continue;
            }
            resolveForRunEntity(userId, entity).ifPresent(rows::add);
        }
        rows.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
        return rows;
    }

    public Map<String, Object> toRunMetadata(Long userId, AgentSkillEntity entity, boolean userSpecified) {
        return AgentSkillPromptSupport.toMetadataMap(
            entity,
            enabledForUser(userId, entity),
            userSpecified
        );
    }

    @Transactional
    public AgentSkillDTO setEnabled(Long userId, UUID skillId, boolean enabled) {
        AgentSkillEntity entity = requireReadable(userId, skillId);
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            UserSkillRefEntity ref = refRepository.findByUserIdAndSkillId(userId, skillId)
                .orElseGet(() -> createRef(userId, entity));
            ref.setEnabled(enabled);
            refRepository.save(ref);
            return toDtoForUser(entity, ref, false);
        }
        entity.setEnabled(enabled);
        return toDtoForUser(repository.save(entity), null, false);
    }

    public List<AgentSkillEntity> listSystemSkills() {
        return repository.findByIsSystemTrueOrderByNameAsc();
    }

    public List<AgentSkillDTO> listSystemSkillsForAdmin() {
        return listSystemSkills().stream().map(e -> toDtoForUser(e, null, false)).toList();
    }

    public AgentSkillDTO getSystemSkillForAdmin(UUID id) {
        return toDtoForUser(requireSystemSkill(id), null, true);
    }

    @Transactional
    public AgentSkillDTO createSystemSkill(CreateAgentSkillRequest req) {
        String name = normalizeName(req.name());
        validateNameSlug(name);
        if (repository.findByNameAndIsSystemTrue(name).isPresent()) {
            throw ValidationException.keyed("agent.skill.name_taken", name);
        }
        String content = sanitizeContent(requireContent(req.content()));
        validateContentLength(content);

        AgentSkillEntity entity = new AgentSkillEntity();
        entity.setUserId(null);
        entity.setName(name);
        entity.setVersion(1);
        entity.setDescription(trimToNull(req.description()));
        entity.setContent(content);
        entity.setToolsJson(normalizeTools(req.tools()));
        entity.setLocale(normalizeLocale(req.locale()));
        entity.setIsSystem(true);
        return toDtoForUser(repository.save(entity), null, true);
    }

    @Transactional
    public AgentSkillDTO updateSystemSkill(UUID id, UpdateAgentSkillRequest req) {
        AgentSkillEntity entity = requireSystemSkill(id);
        if (entity.getVersion() == null || entity.getVersion() != req.version()) {
            throw new BizException(409, "agent.skill.version_mismatch");
        }
        String content = sanitizeContent(requireContent(req.content()));
        validateContentLength(content);

        archiveRevision(entity);

        entity.setDescription(trimToNull(req.description()));
        entity.setContent(content);
        entity.setToolsJson(normalizeTools(req.tools()));
        entity.setLocale(normalizeLocale(req.locale()));
        entity.setVersion(entity.getVersion() + 1);
        return toDtoForUser(repository.save(entity), null, true);
    }

    @Transactional
    public void deleteSystemSkill(UUID id) {
        AgentSkillEntity entity = requireSystemSkill(id);
        entity.setDeletedAt(Instant.now());
        repository.save(entity);
    }

    static String sanitizeContent(String content) {
        if (content == null) {
            return "";
        }
        return content.replaceAll("(?i)<script", "");
    }

    private Optional<AgentSkillEntity> resolveForRunEntity(Long userId, AgentSkillEntity entity) {
        if (!Boolean.TRUE.equals(entity.getIsSystem())) {
            return Optional.of(entity);
        }
        if (userId == null || userId <= 0) {
            return Optional.of(entity);
        }
        Optional<UserSkillRefEntity> refOpt = refRepository.findByUserIdAndSkillId(userId, entity.getId());
        if (refOpt.isEmpty()) {
            log.warn("agent skill skipped: official skill not referenced skillId={} userId={}", entity.getId(), userId);
            return Optional.empty();
        }
        UserSkillRefEntity ref = refOpt.get();
        if (Boolean.TRUE.equals(ref.getAutoUpdate())) {
            return Optional.of(entity);
        }
        int latest = latestVersion(entity);
        if (Objects.equals(ref.getPinnedVersion(), latest)) {
            return Optional.of(entity);
        }
        return overlayRevision(entity, ref.getPinnedVersion()).or(() -> Optional.of(entity));
    }

    private Optional<AgentSkillEntity> overlayRevision(AgentSkillEntity entity, int pinnedVersion) {
        return revisionRepository.findBySkillIdAndVersion(entity.getId(), pinnedVersion)
            .map(rev -> {
                AgentSkillEntity copy = shallowCopy(entity);
                copy.setVersion(pinnedVersion);
                copy.setDescription(rev.getDescription());
                copy.setContent(rev.getContent());
                copy.setToolsJson(rev.getToolsJson() == null ? List.of() : List.copyOf(rev.getToolsJson()));
                copy.setLocale(rev.getLocale());
                return copy;
            });
    }

    private static AgentSkillEntity shallowCopy(AgentSkillEntity source) {
        AgentSkillEntity copy = new AgentSkillEntity();
        copy.setId(source.getId());
        copy.setUserId(source.getUserId());
        copy.setName(source.getName());
        copy.setVersion(source.getVersion());
        copy.setDescription(source.getDescription());
        copy.setContent(source.getContent());
        copy.setToolsJson(source.getToolsJson() == null ? List.of() : new ArrayList<>(source.getToolsJson()));
        copy.setLocale(source.getLocale());
        copy.setIsSystem(source.getIsSystem());
        copy.setEnabled(source.getEnabled());
        return copy;
    }

    @Transactional
    protected UserSkillRefEntity createRef(Long userId, AgentSkillEntity entity) {
        UserSkillRefEntity ref = new UserSkillRefEntity();
        ref.setUserId(userId);
        ref.setSkillId(entity.getId());
        ref.setPinnedVersion(latestVersion(entity));
        ref.setAutoUpdate(false);
        ref.setEnabled(true);
        return refRepository.save(ref);
    }

    private static boolean isEnabled(AgentSkillEntity entity, UserSkillRefEntity ref) {
        if (ref != null) {
            return !Boolean.FALSE.equals(ref.getEnabled());
        }
        if (entity != null) {
            return !Boolean.FALSE.equals(entity.getEnabled());
        }
        return true;
    }

    private void archiveRevision(AgentSkillEntity entity) {
        int version = latestVersion(entity);
        if (revisionRepository.findBySkillIdAndVersion(entity.getId(), version).isPresent()) {
            return;
        }
        AgentSkillRevisionEntity rev = new AgentSkillRevisionEntity();
        rev.setSkillId(entity.getId());
        rev.setVersion(version);
        rev.setDescription(entity.getDescription());
        rev.setContent(entity.getContent());
        rev.setToolsJson(entity.getToolsJson() == null ? List.of() : List.copyOf(entity.getToolsJson()));
        rev.setLocale(entity.getLocale());
        revisionRepository.save(rev);
    }

    private Map<UUID, UserSkillRefEntity> loadRefsForUser(Long userId, List<AgentSkillEntity> rows) {
        List<UUID> systemIds = rows.stream()
            .filter(e -> Boolean.TRUE.equals(e.getIsSystem()))
            .map(AgentSkillEntity::getId)
            .toList();
        if (systemIds.isEmpty()) {
            return Map.of();
        }
        return refRepository.findByUserIdAndSkillIdIn(userId, systemIds).stream()
            .collect(Collectors.toMap(UserSkillRefEntity::getSkillId, r -> r, (a, b) -> a, HashMap::new));
    }

    private UserSkillRefEntity refFor(Long userId, AgentSkillEntity entity) {
        if (!Boolean.TRUE.equals(entity.getIsSystem())) {
            return null;
        }
        return refRepository.findByUserIdAndSkillId(userId, entity.getId()).orElse(null);
    }

    public boolean enabledForUser(Long userId, AgentSkillEntity entity) {
        if (userId == null || userId <= 0) {
            return isEnabled(entity, null);
        }
        return isEnabled(entity, refFor(userId, entity));
    }

    private Optional<AgentSkillEntity> resolveBase(Long userId, String idOrSlug) {
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
            // slug
        }
        Optional<AgentSkillEntity> system = repository.findByNameAndIsSystemTrue(idOrSlug);
        if (system.isPresent()) {
            return system;
        }
        return repository.findByNameAndUserId(idOrSlug, userId);
    }

    private AgentSkillEntity requireSystemSkill(UUID id) {
        return repository.findById(id)
            .filter(e -> Boolean.TRUE.equals(e.getIsSystem()))
            .orElseThrow(() -> skillNotFound(id));
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

    private AgentSkillDTO toDtoForUser(AgentSkillEntity entity, UserSkillRefEntity ref, boolean includeContent) {
        int latest = latestVersion(entity);
        Integer pinnedVersion = null;
        Boolean autoUpdate = null;
        boolean updateAvailable = false;
        String content = includeContent ? entity.getContent() : null;

        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            if (ref != null) {
                pinnedVersion = ref.getPinnedVersion();
                autoUpdate = ref.getAutoUpdate();
                updateAvailable = !Boolean.TRUE.equals(ref.getAutoUpdate())
                    && ref.getPinnedVersion() != null
                    && ref.getPinnedVersion() < latest;
                if (includeContent && ref != null && !Boolean.TRUE.equals(ref.getAutoUpdate())
                    && ref.getPinnedVersion() != null && !Objects.equals(ref.getPinnedVersion(), latest)) {
                    content = overlayRevision(entity, ref.getPinnedVersion())
                        .map(AgentSkillEntity::getContent)
                        .orElse(entity.getContent());
                }
            }
        }

        boolean inLibrary = !Boolean.TRUE.equals(entity.getIsSystem()) || ref != null;
        boolean enabled = isEnabled(entity, ref);

        List<String> tools = entity.getToolsJson() == null ? List.of() : List.copyOf(entity.getToolsJson());
        return new AgentSkillDTO(
            entity.getId(),
            entity.getName(),
            entity.getDescription(),
            entity.getLocale(),
            Boolean.TRUE.equals(entity.getIsSystem()),
            tools,
            latest,
            content,
            pinnedVersion,
            autoUpdate,
            Boolean.TRUE.equals(entity.getIsSystem()) ? updateAvailable : null,
            inLibrary,
            enabled
        );
    }

    private static int latestVersion(AgentSkillEntity entity) {
        return entity.getVersion() == null ? 1 : entity.getVersion();
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
}
