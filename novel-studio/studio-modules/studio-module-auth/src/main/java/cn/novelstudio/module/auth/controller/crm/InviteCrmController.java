package cn.novelstudio.module.auth.controller.crm;

import cn.novelstudio.module.auth.service.crm.biz.InviteCrmBiz;
import cn.novelstudio.module.auth.service.crm.req.InviteCrmCreateReq;
import cn.novelstudio.module.auth.service.crm.req.InviteCrmDisableReq;
import cn.novelstudio.module.auth.service.crm.req.InviteCrmUpdateReq;
import cn.novelstudio.module.auth.service.crm.resp.InviteCrmItemResp;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth/crm/invite-codes")
@RequiredArgsConstructor
public class InviteCrmController extends BaseController {

    private final InviteCrmBiz biz;

    @GetMapping
    public Result<List<InviteCrmItemResp>> list(
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.listAll();
    }

    @PostMapping
    public Result<InviteCrmItemResp> create(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody InviteCrmCreateReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.create(req, parseActorId(actorHeader));
    }

    @PutMapping("/{id}")
    public Result<InviteCrmItemResp> update(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody InviteCrmUpdateReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.update(id, req, parseActorId(actorHeader));
    }

    @PostMapping("/{id}/disable")
    public Result<InviteCrmItemResp> disableById(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.disable(id, parseActorId(actorHeader));
    }

    @PostMapping("/disable")
    public Result<InviteCrmItemResp> disable(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody InviteCrmDisableReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.disable(req.id(), parseActorId(actorHeader));
    }

    private static Long parseActorId(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
