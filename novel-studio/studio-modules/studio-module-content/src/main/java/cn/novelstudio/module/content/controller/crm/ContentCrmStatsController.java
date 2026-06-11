package cn.novelstudio.module.content.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.service.crm.biz.ContentCrmStatsBiz;
import cn.novelstudio.module.content.service.crm.resp.CrmStatsOverviewResp;
import cn.novelstudio.module.content.service.crm.resp.CrmStatsTrendResp;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content/crm/stats")
@RequiredArgsConstructor
public class ContentCrmStatsController extends BaseController {

    private final ContentCrmStatsBiz biz;

    @GetMapping("/overview")
    public Result<CrmStatsOverviewResp> overview() {
        return biz.overview();
    }

    @GetMapping("/trends")
    public Result<CrmStatsTrendResp> trends(@RequestParam(defaultValue = "30") int days) {
        return biz.trends(days);
    }
}
