package com.novel.agent.content.controller.crm;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.service.crm.biz.CrmStatsBiz;
import com.novel.agent.content.service.crm.resp.CrmStatsOverviewResp;
import com.novel.agent.content.service.crm.resp.CrmStatsTrendResp;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content/crm/stats")
@RequiredArgsConstructor
public class CrmStatsController extends BaseController {

    private final CrmStatsBiz biz;

    @GetMapping("/overview")
    public Result<CrmStatsOverviewResp> overview() {
        return biz.overview();
    }

    @GetMapping("/trends")
    public Result<CrmStatsTrendResp> trends(@RequestParam(defaultValue = "30") int days) {
        return biz.trends(days);
    }
}
