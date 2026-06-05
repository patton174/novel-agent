package com.novel.agent.auth.controller.auth;

import com.novel.agent.auth.security.JwtAuthService;
import com.novel.agent.auth.service.auth.biz.AuthUserInfoBiz;
import com.novel.agent.auth.service.auth.resp.AuthUserInfoResp;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/auth")
@RequiredArgsConstructor
public class AuthUserInfoController extends BaseController {

    private final AuthUserInfoBiz biz;
    private final JwtAuthService jwtAuthService;

    @GetMapping("/info")
    public Result<AuthUserInfoResp> info(
        @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(userIdHeader, authorization);
        return biz.getInfo(userId);
    }

    private Long resolveUserId(String userIdHeader, String authorization) {
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            return parseUserId(userIdHeader);
        }
        return jwtAuthService.parseAccessUserId(authorization);
    }
}
