package com.novel.agent.feign.auth;

import com.novel.agent.feign.auth.dto.FeignTrendPointDto;
import com.novel.agent.feign.auth.dto.FeignUserStatsOverviewDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

public interface IFeignUserStats {

    @GetMapping("/stats/overview")
    FeignUserStatsOverviewDto getOverview();

    @GetMapping("/stats/registrations")
    List<FeignTrendPointDto> getRegistrationTrends(@RequestParam(value = "days", defaultValue = "30") int days);
}
