package cn.novelstudio.module.auth.service.crm.biz;

import cn.novelstudio.module.auth.dao.UserInfoDao;
import cn.novelstudio.module.auth.service.crm.resp.CrmPlatformStatsResp;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
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
