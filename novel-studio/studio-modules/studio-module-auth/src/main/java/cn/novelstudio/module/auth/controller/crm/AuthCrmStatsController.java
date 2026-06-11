package cn.novelstudio.module.auth.controller.crm;

import cn.novelstudio.module.auth.service.crm.biz.AuthCrmStatsBiz;
import cn.novelstudio.module.auth.service.crm.resp.CrmPlatformStatsResp;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/crm/stats")
@RequiredArgsConstructor
public class AuthCrmStatsController extends BaseController {

    private final AuthCrmStatsBiz biz;

    @GetMapping("/overview")
    public Result<CrmPlatformStatsResp> overview() {
        return biz.overview();
    }
}
