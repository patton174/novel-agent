package cn.novelstudio.module.agent.controller.internal;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.module.content.entity.agent.CrewTemplateEntity;
import cn.novelstudio.module.content.service.agent.CrewTemplateService;
import cn.novelstudio.platform.web.clientsecurity.ClientAuthSupport;
import cn.novelstudio.platform.web.internal.InternalServiceGuard;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/internal/agent/crews")
public class InternalCrewTemplateController {

    private final CrewTemplateService crewTemplateService;
    private final InternalServiceGuard internalServiceGuard;

    public InternalCrewTemplateController(
        CrewTemplateService crewTemplateService,
        InternalServiceGuard internalServiceGuard
    ) {
        this.crewTemplateService = crewTemplateService;
        this.internalServiceGuard = internalServiceGuard;
    }

    @GetMapping("/{id}")
    public Map<String, Object> getById(HttpServletRequest request, @PathVariable String id) {
        requireTrustedService(request);
        Long userId = parseOptionalUserId(request);
        CrewTemplateEntity entity = crewTemplateService.findAccessible(userId, id)
            .orElseThrow(() -> NotFoundException.keyed("agent.crew.not_found", id));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId());
        map.put("display_name", entity.getDisplayName());
        map.put("description", entity.getDescription());
        map.put("stages", entity.getStagesJson());
        map.put("stages_summary", crewTemplateService.stagesSummaryForContext(entity));
        map.put("is_system", entity.getIsSystem());
        return map;
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
