package cn.novelstudio.module.agent.controller.internal;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.module.agent.support.AgentProfilePromptSupport;
import cn.novelstudio.module.content.entity.agent.AgentProfileEntity;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.service.agent.AgentProfileService;
import cn.novelstudio.platform.web.clientsecurity.ClientAuthSupport;
import cn.novelstudio.platform.web.internal.InternalServiceGuard;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/agent/profiles")
public class InternalAgentProfileController {

    private final AgentProfileService profileService;
    private final InternalServiceGuard internalServiceGuard;

    public InternalAgentProfileController(AgentProfileService profileService, InternalServiceGuard internalServiceGuard) {
        this.profileService = profileService;
        this.internalServiceGuard = internalServiceGuard;
    }

    @GetMapping("/{id}")
    public Map<String, Object> getById(HttpServletRequest request, @PathVariable String id) {
        requireTrustedService(request);
        Long userId = parseOptionalUserId(request);
        AgentProfileEntity profile = profileService.findAccessible(userId, id)
            .orElseThrow(() -> NotFoundException.keyed("agent.profile.not_found", id));
        List<String> allowlist = profileService.resolveToolAllowlist(profile);
        List<AgentSkillEntity> skills = profileService.resolveSkillIds(userId, profile);
        return AgentProfilePromptSupport.toInternalProfileMap(profile, allowlist, skills);
    }

    private void requireTrustedService(HttpServletRequest request) {
        try {
            internalServiceGuard.requireValidKey(request.getHeader(ClientAuthSupport.INTERNAL_KEY_HEADER));
        } catch (RuntimeException ex) {
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
}
