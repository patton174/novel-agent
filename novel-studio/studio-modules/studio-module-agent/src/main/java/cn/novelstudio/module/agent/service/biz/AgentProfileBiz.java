package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.agent.AgentProfileDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentProfileRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentProfileRequest;
import cn.novelstudio.module.content.service.agent.AgentProfileService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AgentProfileBiz extends BaseBiz {

    private final AgentProfileService profileService;

    public AgentProfileBiz(AgentProfileService profileService) {
        this.profileService = profileService;
    }

    public Result<List<AgentProfileDTO>> list(Long userId) {
        return ok(profileService.listForUser(userId));
    }

    public Result<AgentProfileDTO> get(Long userId, String id) {
        return ok(profileService.getForUser(userId, id));
    }

    public Result<AgentProfileDTO> create(Long userId, CreateAgentProfileRequest request) {
        return ok(profileService.create(userId, request));
    }

    public Result<AgentProfileDTO> update(Long userId, String id, UpdateAgentProfileRequest request) {
        return ok(profileService.update(userId, id, request));
    }

    public Result<Void> delete(Long userId, String id) {
        profileService.delete(userId, id);
        return ok();
    }
}
