package cn.novelstudio.module.auth.dto;

public record UserStatsOverviewDto(
    long totalUsers,
    long todayRegistrations,
    long activeUsers
) {}
