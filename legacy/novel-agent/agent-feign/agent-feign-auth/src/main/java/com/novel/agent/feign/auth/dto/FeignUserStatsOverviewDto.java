package com.novel.agent.feign.auth.dto;

public record FeignUserStatsOverviewDto(
    long totalUsers,
    long todayRegistrations,
    long activeUsers
) {}
