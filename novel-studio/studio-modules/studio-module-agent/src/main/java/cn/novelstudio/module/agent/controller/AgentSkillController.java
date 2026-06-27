package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.AgentSkillBiz;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agent/skills")
public class AgentSkillController extends BaseController {

    private final AgentSkillBiz biz;

    public AgentSkillController(AgentSkillBiz biz) {
        this.biz = biz;
    }

    @GetMapping
    public Result<List<AgentSkillDTO>> list(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader
    ) {
        return biz.list(parseUserId(userIdHeader));
    }

    @GetMapping("/{id}")
    public Result<AgentSkillDTO> get(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id
    ) {
        return biz.get(parseUserId(userIdHeader), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Result<AgentSkillDTO> create(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @Valid @RequestBody CreateAgentSkillRequest request
    ) {
        return biz.create(parseUserId(userIdHeader), request);
    }

    @PutMapping("/{id}")
    public Result<AgentSkillDTO> update(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id,
        @Valid @RequestBody UpdateAgentSkillRequest request
    ) {
        return biz.update(parseUserId(userIdHeader), id, request);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id
    ) {
        return biz.delete(parseUserId(userIdHeader), id);
    }
}
