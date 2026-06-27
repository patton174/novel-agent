package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.module.content.service.agent.AgentSkillService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class AdminAgentSkillBiz extends BaseBiz {

    private final AgentSkillService skillService;

    public AdminAgentSkillBiz(AgentSkillService skillService) {
        this.skillService = skillService;
    }

    public Result<List<AgentSkillDTO>> list() {
        return ok(skillService.listSystemSkillsForAdmin());
    }

    public Result<AgentSkillDTO> get(UUID id) {
        return ok(skillService.getSystemSkillForAdmin(id));
    }

    public Result<AgentSkillDTO> create(CreateAgentSkillRequest request) {
        return ok(skillService.createSystemSkill(request));
    }

    public Result<AgentSkillDTO> update(UUID id, UpdateAgentSkillRequest request) {
        return ok(skillService.updateSystemSkill(id, request));
    }

    public Result<Void> delete(UUID id) {
        skillService.deleteSystemSkill(id);
        return ok();
    }
}
