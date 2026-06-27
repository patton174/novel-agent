package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.AdminAgentSkillBiz;
import cn.novelstudio.platform.web.clientsecurity.ClientAuthSupport;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.platform.web.AuthRoleSupport;
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
@RequestMapping("/api/admin/agent/skills")
public class AdminAgentSkillController extends BaseController {

    private final AdminAgentSkillBiz biz;

    public AdminAgentSkillController(AdminAgentSkillBiz biz) {
        this.biz = biz;
    }

    @GetMapping
    public Result<List<AgentSkillDTO>> list(
        @RequestHeader(name = ClientAuthSupport.USER_ROLES_HEADER, required = false) String rolesHeader
    ) {
        AuthRoleSupport.requireAdmin(rolesHeader);
        return biz.list();
    }

    @GetMapping("/{id}")
    public Result<AgentSkillDTO> get(
        @RequestHeader(name = ClientAuthSupport.USER_ROLES_HEADER, required = false) String rolesHeader,
        @PathVariable UUID id
    ) {
        AuthRoleSupport.requireAdmin(rolesHeader);
        return biz.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Result<AgentSkillDTO> create(
        @RequestHeader(name = ClientAuthSupport.USER_ROLES_HEADER, required = false) String rolesHeader,
        @Valid @RequestBody CreateAgentSkillRequest request
    ) {
        AuthRoleSupport.requireAdmin(rolesHeader);
        return biz.create(request);
    }

    @PutMapping("/{id}")
    public Result<AgentSkillDTO> update(
        @RequestHeader(name = ClientAuthSupport.USER_ROLES_HEADER, required = false) String rolesHeader,
        @PathVariable UUID id,
        @Valid @RequestBody UpdateAgentSkillRequest request
    ) {
        AuthRoleSupport.requireAdmin(rolesHeader);
        return biz.update(id, request);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(
        @RequestHeader(name = ClientAuthSupport.USER_ROLES_HEADER, required = false) String rolesHeader,
        @PathVariable UUID id
    ) {
        AuthRoleSupport.requireAdmin(rolesHeader);
        return biz.delete(id);
    }
}
