package cn.novelstudio.module.auth.service.crm.resp;

public record CrmPlatformStatsResp(
    long totalUsers,
    long todayRegistrations,
    long activeUsers
) {}
