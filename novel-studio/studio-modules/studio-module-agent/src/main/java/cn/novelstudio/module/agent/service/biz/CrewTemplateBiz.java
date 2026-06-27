package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.agent.CreateCrewTemplateRequest;
import cn.novelstudio.module.content.dto.agent.CrewTemplateDTO;
import cn.novelstudio.module.content.dto.agent.UpdateCrewTemplateRequest;
import cn.novelstudio.module.content.service.agent.CrewTemplateService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CrewTemplateBiz extends BaseBiz {

    private final CrewTemplateService crewTemplateService;

    public CrewTemplateBiz(CrewTemplateService crewTemplateService) {
        this.crewTemplateService = crewTemplateService;
    }

    public Result<List<CrewTemplateDTO>> list(Long userId) {
        return ok(crewTemplateService.listForUser(userId));
    }

    public Result<CrewTemplateDTO> get(Long userId, String id) {
        return ok(crewTemplateService.getForUser(userId, id));
    }

    public Result<CrewTemplateDTO> create(Long userId, CreateCrewTemplateRequest request) {
        return ok(crewTemplateService.create(userId, request));
    }

    public Result<CrewTemplateDTO> update(Long userId, String id, UpdateCrewTemplateRequest request) {
        return ok(crewTemplateService.update(userId, id, request));
    }

    public Result<Void> delete(Long userId, String id) {
        crewTemplateService.delete(userId, id);
        return ok();
    }
}
