package com.novel.agent.auth.service.crm.biz;

import com.novel.agent.auth.dao.UserInfoDao;
import com.novel.agent.auth.service.crm.resp.CrmPlatformStatsResp;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Component
@RequiredArgsConstructor
public class CrmStatsBiz extends BaseBiz {

    private final UserInfoDao userInfoDao;

    public Result<CrmPlatformStatsResp> overview() {
        Instant startOfToday = LocalDate.now(ZoneOffset.UTC)
            .atStartOfDay(ZoneOffset.UTC)
            .toInstant();
        return ok(new CrmPlatformStatsResp(
            userInfoDao.countAll(),
            userInfoDao.countCreatedSince(startOfToday),
            userInfoDao.countActiveUsers()
        ));
    }
}
