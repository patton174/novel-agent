package com.novel.agent.auth.controller.crm;

import com.novel.agent.auth.service.crm.biz.CrmUserBiz;
import com.novel.agent.auth.service.crm.req.CrmUserPageReq;
import com.novel.agent.auth.service.crm.req.CrmUserUpdateReq;
import com.novel.agent.auth.service.crm.resp.CrmUserDetailResp;
import com.novel.agent.auth.service.crm.resp.CrmUserItemResp;
import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
        @Valid @RequestBody CrmUserUpdateReq req
    ) {
        return biz.update(id, req);
    }
}
