package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.AgentSkillBiz;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.SetAgentSkillEnabledRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRefRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
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
        return biz.listLibrary(parseUserId(userIdHeader));
    }

    @GetMapping("/library")
    public Result<List<AgentSkillDTO>> listLibrary(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader
    ) {
        return biz.listLibrary(parseUserId(userIdHeader));
    }

    @GetMapping("/official")
    public Result<List<AgentSkillDTO>> listOfficial(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader
    ) {
        return biz.listOfficial(parseUserId(userIdHeader));
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

    @PostMapping("/{id}/ref")
    public Result<AgentSkillDTO> ensureRef(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id
    ) {
        return biz.ensureRef(parseUserId(userIdHeader), id);
    }

    @PatchMapping("/{id}/ref")
    public Result<AgentSkillDTO> updateRef(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id,
        @RequestBody UpdateAgentSkillRefRequest request
    ) {
        return biz.updateRef(parseUserId(userIdHeader), id, request);
    }

    @PatchMapping("/{id}/enabled")
    public Result<AgentSkillDTO> setEnabled(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id,
        @Valid @RequestBody SetAgentSkillEnabledRequest request
    ) {
        return biz.setEnabled(parseUserId(userIdHeader), id, request.enabled());
    }

    @DeleteMapping("/{id}/ref")
    public Result<Void> removeRef(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable UUID id
    ) {
        return biz.removeRef(parseUserId(userIdHeader), id);
    }
}
