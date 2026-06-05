package com.novel.agent.content.service.internal;

import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.service.crm.biz.CrmStatsBiz;
import com.novel.agent.content.service.crm.resp.CrmStatsOverviewResp;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * internal content 统计。鉴权由 {@link com.novel.agent.content.config.InternalServiceKeyInterceptor} 统一处理。
 */
@Component
@RequiredArgsConstructor
public class InternalContentStatsBiz extends BaseBiz {

    private final CrmStatsBiz crmStatsBiz;

    public CrmStatsOverviewResp overview() {
        return crmStatsBiz.overview().data();
    }
}
