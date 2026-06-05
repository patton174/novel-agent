package com.novel.agent.content.controller.internal;

import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.service.crm.resp.CrmStatsOverviewResp;
import com.novel.agent.content.service.internal.InternalContentStatsBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/content")
@RequiredArgsConstructor
public class InternalContentStatsController extends BaseController {

    private final InternalContentStatsBiz biz;

    @GetMapping("/stats/overview")
    public CrmStatsOverviewResp getOverview() {
        return biz.overview();
    }
}
