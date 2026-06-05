package com.novel.agent.auth.controller.auth;

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

    @GetMapping("/info")
    public Result<AuthUserInfoResp> info(@RequestHeader("X-User-Id") String userId) {
        return biz.getInfo(parseUserId(userId));
    }
}
