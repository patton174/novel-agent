package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.AgentProfileBiz;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import cn.novelstudio.module.content.dto.agent.AgentProfileDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentProfileRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentProfileRequest;
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

@RestController
@RequestMapping("/api/agent/profiles")
public class AgentProfileController extends BaseController {

    private final AgentProfileBiz biz;

    public AgentProfileController(AgentProfileBiz biz) {
        this.biz = biz;
    }

    @GetMapping
    public Result<List<AgentProfileDTO>> list(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader
    ) {
        return biz.list(parseUserId(userIdHeader));
    }

    @GetMapping("/{id}")
    public Result<AgentProfileDTO> get(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String id
    ) {
        return biz.get(parseUserId(userIdHeader), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Result<AgentProfileDTO> create(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @Valid @RequestBody CreateAgentProfileRequest request
    ) {
        return biz.create(parseUserId(userIdHeader), request);
    }

    @PutMapping("/{id}")
    public Result<AgentProfileDTO> update(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String id,
        @Valid @RequestBody UpdateAgentProfileRequest request
    ) {
        return biz.update(parseUserId(userIdHeader), id, request);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String id
    ) {
        return biz.delete(parseUserId(userIdHeader), id);
    }
}
