package com.novel.agent.auth.controller.internal;

import com.novel.agent.auth.service.internal.InternalUserStatsBiz;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.feign.auth.dto.FeignTrendPointDto;
import com.novel.agent.feign.auth.dto.FeignUserStatsOverviewDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal/auth")
@RequiredArgsConstructor
public class InternalUserStatsController extends BaseController {

    private final InternalUserStatsBiz internalUserStatsBiz;

    @GetMapping("/stats/overview")
    public FeignUserStatsOverviewDto getOverview() {
        return internalUserStatsBiz.overview();
    }

    @GetMapping("/stats/registrations")
    public List<FeignTrendPointDto> getRegistrationTrends(
        @RequestParam(value = "days", defaultValue = "30") int days
    ) {
        return internalUserStatsBiz.registrationTrends(days);
    }
}
