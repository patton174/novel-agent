package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.SetAgentSkillEnabledRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRefRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.module.content.service.agent.AgentSkillService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class AgentSkillBiz extends BaseBiz {

    private final AgentSkillService skillService;

    public AgentSkillBiz(AgentSkillService skillService) {
        this.skillService = skillService;
    }

    public Result<List<AgentSkillDTO>> list(Long userId) {
        return ok(skillService.listLibraryForUser(userId));
    }

    public Result<List<AgentSkillDTO>> listLibrary(Long userId) {
        return ok(skillService.listLibraryForUser(userId));
    }

    public Result<List<AgentSkillDTO>> listOfficial(Long userId) {
        return ok(skillService.listOfficialCatalogForUser(userId));
    }

    public Result<AgentSkillDTO> get(Long userId, UUID id) {
        return ok(skillService.getForUser(userId, id));
    }

    public Result<AgentSkillDTO> create(Long userId, CreateAgentSkillRequest request) {
        return ok(skillService.create(userId, request));
    }

    public Result<AgentSkillDTO> update(Long userId, UUID id, UpdateAgentSkillRequest request) {
        return ok(skillService.update(userId, id, request));
    }

    public Result<Void> delete(Long userId, UUID id) {
        skillService.delete(userId, id);
        return ok();
    }

    public Result<AgentSkillDTO> ensureRef(Long userId, UUID id) {
        return ok(skillService.ensureUserRef(userId, id));
    }

    public Result<AgentSkillDTO> updateRef(Long userId, UUID id, UpdateAgentSkillRefRequest request) {
        return ok(skillService.updateUserRef(userId, id, request));
    }

    public Result<Void> removeRef(Long userId, UUID id) {
        skillService.removeUserRef(userId, id);
        return ok();
    }

    public Result<AgentSkillDTO> setEnabled(Long userId, UUID id, boolean enabled) {
        return ok(skillService.setEnabled(userId, id, enabled));
    }
}
