package cn.novelstudio.module.auth.controller.internal;

import cn.novelstudio.module.auth.service.internal.InternalUserStatsBiz;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.auth.dto.UserTrendPointDto;
import cn.novelstudio.module.auth.dto.UserStatsOverviewDto;
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
    public UserStatsOverviewDto getOverview() {
        return internalUserStatsBiz.overview();
    }

    @GetMapping("/stats/registrations")
    public List<UserTrendPointDto> getRegistrationTrends(
        @RequestParam(value = "days", defaultValue = "30") int days
    ) {
        return internalUserStatsBiz.registrationTrends(days);
    }
}
