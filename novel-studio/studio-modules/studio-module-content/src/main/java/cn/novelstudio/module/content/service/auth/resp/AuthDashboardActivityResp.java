package cn.novelstudio.module.content.service.auth.resp;

import java.util.List;

public record AuthDashboardActivityResp(
    List<AuthDashboardActivityDayResp> days,
    long totalWritingWords,
    long totalAgentRuns
) {}
