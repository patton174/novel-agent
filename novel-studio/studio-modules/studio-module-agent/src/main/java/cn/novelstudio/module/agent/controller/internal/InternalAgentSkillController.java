package cn.novelstudio.module.agent.controller.internal;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.module.agent.dto.agent.ResolveAgentSkillsRequest;
import cn.novelstudio.module.agent.dto.agent.ResolveAgentSkillsResponse;
import cn.novelstudio.module.agent.support.AgentSkillPromptSupport;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.service.agent.AgentSkillService;
import cn.novelstudio.platform.web.clientsecurity.ClientAuthSupport;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/internal/agent/skills")
public class InternalAgentSkillController {

    private final AgentSkillService skillService;
    private final ClientAuthSupport clientAuthSupport;

    public InternalAgentSkillController(AgentSkillService skillService, ClientAuthSupport clientAuthSupport) {
        this.skillService = skillService;
        this.clientAuthSupport = clientAuthSupport;
    }

    @GetMapping("/bundled")
    public List<Map<String, Object>> bundled(HttpServletRequest request) {
        requireTrustedService(request);
        return skillService.listSystemSkills().stream()
            .map(this::toInternalSkillMap)
            .toList();
    }

    @GetMapping("/{idOrSlug}")
    public Map<String, Object> getByIdOrSlug(
        HttpServletRequest request,
        @PathVariable String idOrSlug
    ) {
        requireTrustedService(request);
        Long userId = parseOptionalUserId(request);
        AgentSkillEntity entity = skillService.findAccessible(userId, idOrSlug)
            .orElseThrow(() -> NotFoundException.keyed("agent.skill.not_found", idOrSlug));
        return toInternalSkillMap(entity);
    }

    @PostMapping("/resolve")
    public ResolveAgentSkillsResponse resolve(
        HttpServletRequest request,
        @RequestBody ResolveAgentSkillsRequest body
    ) {
        requireTrustedService(request);
        if (body.userId() == null || body.userId() <= 0) {
            throw UnauthorizedException.keyed("result.framework.invalid_user_id");
        }
        List<String> skillIds = body.skillIds() == null ? List.of() : body.skillIds();
        List<AgentSkillEntity> resolved = skillService.getForRun(body.userId(), skillIds);
        List<Map<String, Object>> skills = resolved.stream()
            .map(AgentSkillPromptSupport::toMetadataMap)
            .toList();
        String mergedPrompt = AgentSkillPromptSupport.mergePrompt(resolved);
        return new ResolveAgentSkillsResponse(skills, mergedPrompt);
    }

    private void requireTrustedService(HttpServletRequest request) {
        if (!clientAuthSupport.isTrustedService(request)) {
            throw UnauthorizedException.keyed("result.framework.not_logged_in");
        }
    }

    private static Long parseOptionalUserId(HttpServletRequest request) {
        String header = request.getHeader(ClientAuthSupport.USER_ID_HEADER);
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            long userId = Long.parseLong(header.trim());
            return userId > 0 ? userId : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Map<String, Object> toInternalSkillMap(AgentSkillEntity entity) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId().toString());
        map.put("name", entity.getName());
        map.put("description", entity.getDescription());
        map.put("content", entity.getContent());
        map.put("tools", entity.getToolsJson() == null ? List.of() : List.copyOf(entity.getToolsJson()));
        map.put("locale", entity.getLocale());
        return map;
    }
}
