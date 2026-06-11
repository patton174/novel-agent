package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.service.crm.resp.CrmStatsOverviewResp;
import cn.novelstudio.module.content.service.internal.InternalContentStatsBiz;
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
