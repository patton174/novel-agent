package com.novel.agent.auth.controller.crm;

import com.novel.agent.auth.service.crm.biz.CrmStatsBiz;
import com.novel.agent.auth.service.crm.resp.CrmPlatformStatsResp;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/crm/stats")
@RequiredArgsConstructor
public class CrmStatsController extends BaseController {

    private final CrmStatsBiz biz;

    @GetMapping("/overview")
    public Result<CrmPlatformStatsResp> overview() {
        return biz.overview();
    }
}
