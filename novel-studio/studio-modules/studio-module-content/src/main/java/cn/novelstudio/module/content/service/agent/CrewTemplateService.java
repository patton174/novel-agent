package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.dto.agent.CreateCrewTemplateRequest;
import cn.novelstudio.module.content.dto.agent.CrewStageDef;
import cn.novelstudio.module.content.dto.agent.CrewTemplateDTO;
import cn.novelstudio.module.content.dto.agent.UpdateCrewTemplateRequest;
import cn.novelstudio.module.content.entity.agent.CrewRunEntity;
import cn.novelstudio.module.content.entity.agent.CrewTemplateEntity;
import cn.novelstudio.module.content.repository.agent.AgentProfileRepository;
import cn.novelstudio.module.content.repository.agent.CrewRunRepository;
import cn.novelstudio.module.content.repository.agent.CrewTemplateRepository;
import cn.novelstudio.module.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CrewTemplateService {

    private static final Set<String> VALID_GATES = Set.of(
        "always", "on_plan_success", "on_write_success"
    );
    private static final Set<String> VALID_ON_FAIL = Set.of(
        "abort_with_report", "continue"
    );
    private static final Set<String> VALID_OUTPUT_SCHEMA = Set.of(
        "PlanResult", "none", "custom"
    );

    private final CrewTemplateRepository repository;
    private final CrewRunRepository crewRunRepository;
    private final AgentProfileRepository profileRepository;

    public List<CrewTemplateDTO> listForUser(Long userId) {
        return repository.findByUserIdOrIsSystemTrueOrderByDisplayNameAsc(userId).stream()
            .map(this::toDto)
            .toList();
    }

    public CrewTemplateDTO getForUser(Long userId, String id) {
        return toDto(requireReadable(userId, id));
    }

    public Optional<CrewTemplateEntity> findAccessible(Long userId, String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        return repository.findByIdAndIsSystemTrue(id.trim())
            .or(() -> userId == null ? Optional.empty() : repository.findByIdAndUserId(id.trim(), userId));
    }

    @Transactional
    public CrewTemplateDTO create(Long userId, CreateCrewTemplateRequest req) {
        List<Map<String, Object>> stages = validateStages(userId, req.stages());
        CrewTemplateEntity entity = new CrewTemplateEntity();
        entity.setId(UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        entity.setUserId(userId);
        entity.setDisplayName(req.displayName().trim());
        entity.setDescription(trim(req.description()));
        entity.setStagesJson(stages);
        entity.setIsSystem(false);
        return toDto(repository.save(entity));
    }

    @Transactional
    public CrewTemplateDTO update(Long userId, String id, UpdateCrewTemplateRequest req) {
        CrewTemplateEntity entity = repository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> crewNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.crew.system_readonly");
        }
        List<Map<String, Object>> stages = validateStages(userId, req.stages());
        entity.setDisplayName(req.displayName().trim());
        entity.setDescription(trim(req.description()));
        entity.setStagesJson(stages);
        return toDto(repository.save(entity));
    }

    @Transactional
    public void delete(Long userId, String id) {
        CrewTemplateEntity entity = repository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> crewNotFound(id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw ContentExceptions.badRequest("agent.crew.system_readonly");
        }
        entity.setDeletedAt(Instant.now());
        repository.save(entity);
    }

    @Transactional
    public CrewRunEntity createCrewRun(Long userId, String crewTemplateId, String sessionId, String rootRunId) {
        requireReadable(userId, crewTemplateId);
        CrewRunEntity run = new CrewRunEntity();
        run.setCrewTemplateId(crewTemplateId);
        run.setSessionId(sessionId);
        run.setRootRunId(rootRunId);
        run.setUserId(userId);
        run.setStatus("running");
        run.setStageOutputsJson(new HashMap<>());
        return crewRunRepository.save(run);
    }

    public List<Map<String, Object>> stagesSummaryForContext(CrewTemplateEntity entity) {
        if (entity == null || entity.getStagesJson() == null) {
            return List.of();
        }
        List<Map<String, Object>> summary = new ArrayList<>();
        for (Map<String, Object> stage : entity.getStagesJson()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", stage.get("key"));
            row.put("profile_id", stage.get("profileId"));
            row.put("gate", stage.get("gate"));
            row.put("output_schema", stage.get("outputSchema"));
            if (stage.get("skillIds") instanceof List<?> skills && !skills.isEmpty()) {
                row.put("skill_ids", skills);
            }
            summary.add(row);
        }
        return summary;
    }

    List<Map<String, Object>> validateStages(Long userId, List<CrewStageDef> stages) {
        if (stages == null || stages.isEmpty()) {
            throw ValidationException.keyed("agent.crew.stages_required");
        }
        Set<String> keys = new HashSet<>();
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (CrewStageDef stage : stages) {
            if (stage.key() == null || stage.key().isBlank()) {
                throw ValidationException.keyed("agent.crew.stage_key_required");
            }
            String key = stage.key().trim();
            if (!keys.add(key)) {
                throw ValidationException.keyed("agent.crew.stage_key_duplicate", key);
            }
            if (stage.profileId() == null || stage.profileId().isBlank()) {
                throw ValidationException.keyed("agent.crew.stage_profile_required", key);
            }
            String profileId = stage.profileId().trim();
            if (profileRepository.findByIdAndIsSystemTrue(profileId).isEmpty()
                && (userId == null || profileRepository.findByIdAndUserId(profileId, userId).isEmpty())) {
                throw ValidationException.keyed("agent.crew.stage_profile_not_found", profileId);
            }
            String gate = stage.gate() == null ? "always" : stage.gate().trim();
            if (!VALID_GATES.contains(gate)) {
                throw ValidationException.keyed("agent.crew.stage_gate_invalid", gate);
            }
            String onFail = stage.onFail() == null ? "continue" : stage.onFail().trim();
            if (!VALID_ON_FAIL.contains(onFail)) {
                throw ValidationException.keyed("agent.crew.stage_on_fail_invalid", onFail);
            }
            String outputSchema = stage.outputSchema() == null ? "none" : stage.outputSchema().trim();
            if (!VALID_OUTPUT_SCHEMA.contains(outputSchema)) {
                throw ValidationException.keyed("agent.crew.stage_output_schema_invalid", outputSchema);
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", key);
            row.put("profileId", profileId);
            row.put("promptTemplate", stage.promptTemplate() == null ? "" : stage.promptTemplate().trim());
            row.put("outputSchema", outputSchema);
            row.put("gate", gate);
            row.put("onFail", onFail);
            if (stage.skillIds() != null && !stage.skillIds().isEmpty()) {
                row.put("skillIds", List.copyOf(stage.skillIds()));
            }
            normalized.add(row);
        }
        return normalized;
    }

    private CrewTemplateEntity requireReadable(Long userId, String id) {
        return findAccessible(userId, id).orElseThrow(() -> crewNotFound(id));
    }

    private CrewTemplateDTO toDto(CrewTemplateEntity e) {
        CrewTemplateDTO dto = new CrewTemplateDTO();
        dto.setId(e.getId());
        dto.setDisplayName(e.getDisplayName());
        dto.setDescription(e.getDescription());
        dto.setStages(e.getStagesJson());
        dto.setIsSystem(e.getIsSystem());
        return dto;
    }

    private static String trim(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static NotFoundException crewNotFound(String id) {
        return NotFoundException.keyed("agent.crew.not_found", id);
    }
}
