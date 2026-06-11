package cn.novelstudio.module.content.service.internal;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.service.crm.biz.CrmStatsBiz;
import cn.novelstudio.module.content.service.crm.resp.CrmStatsOverviewResp;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * internal content 统计。鉴权由 {@link cn.novelstudio.module.content.config.InternalServiceKeyInterceptor} 统一处理。
 */
@Component
@RequiredArgsConstructor
public class InternalContentStatsBiz extends BaseBiz {

    private final CrmStatsBiz crmStatsBiz;

    public CrmStatsOverviewResp overview() {
        return crmStatsBiz.overview().data();
    }
}
