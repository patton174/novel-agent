package cn.novelstudio.module.auth.controller.crm;

import cn.novelstudio.module.auth.service.crm.biz.CrmUserBiz;
import cn.novelstudio.module.auth.service.crm.req.CrmUserPageReq;
import cn.novelstudio.module.auth.service.crm.req.CrmUserUpdateReq;
import cn.novelstudio.module.auth.service.crm.resp.CrmUserDetailResp;
import cn.novelstudio.module.auth.service.crm.resp.CrmUserItemResp;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/crm/user")
@RequiredArgsConstructor
public class CrmUserController extends BaseController {

    private final CrmUserBiz biz;

    @GetMapping("/page")
    public Result<Page<CrmUserItemResp>> page(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize,
        @RequestParam(required = false) String usernameKeyword
    ) {
        return biz.page(new CrmUserPageReq(pageCurrent, pageSize, usernameKeyword));
    }

    @GetMapping("/{id}")
    public Result<CrmUserDetailResp> detail(@PathVariable Long id) {
        return biz.detail(id);
    }

    @PutMapping("/{id}")
    public Result<CrmUserDetailResp> update(
        @PathVariable Long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody CrmUserUpdateReq req
    ) {
        Long actorId = parseActorId(actorHeader);
        return biz.update(id, req, actorId);
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
