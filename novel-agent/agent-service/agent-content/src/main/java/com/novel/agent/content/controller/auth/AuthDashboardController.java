package com.novel.agent.content.controller.auth;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.service.auth.biz.AuthDashboardBiz;
import com.novel.agent.content.service.auth.resp.AuthDashboardActivityResp;
import com.novel.agent.content.service.auth.resp.AuthDashboardSummaryResp;
import com.novel.agent.content.service.auth.resp.AuthRecentNovelResp;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/content/auth/dashboard")
@RequiredArgsConstructor
public class AuthDashboardController extends BaseController {

    private final AuthDashboardBiz biz;

    @GetMapping("/summary")
    public Result<AuthDashboardSummaryResp> summary(@RequestHeader("X-User-Id") String userId) {
        return biz.summary(parseUserId(userId));
    }

    @GetMapping("/recent-novels")
    public Result<List<AuthRecentNovelResp>> recentNovels(@RequestHeader("X-User-Id") String userId) {
        return biz.recentNovels(parseUserId(userId));
    }

    @GetMapping("/activity")
    public Result<AuthDashboardActivityResp> activity(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(defaultValue = "365") int days
    ) {
        return biz.activity(parseUserId(userId), days);
    }
}
