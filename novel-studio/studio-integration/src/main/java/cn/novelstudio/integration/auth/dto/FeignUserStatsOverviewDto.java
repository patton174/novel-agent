package cn.novelstudio.integration.auth.dto;

public record FeignUserStatsOverviewDto(
    long totalUsers,
    long todayRegistrations,
    long activeUsers
) {}
