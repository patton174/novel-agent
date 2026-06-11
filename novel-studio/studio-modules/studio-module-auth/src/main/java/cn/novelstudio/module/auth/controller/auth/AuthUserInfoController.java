package cn.novelstudio.module.auth.controller.auth;

import cn.novelstudio.module.auth.security.AuthUserIdResolver;
import cn.novelstudio.module.auth.service.auth.biz.AuthUserInfoBiz;
import cn.novelstudio.module.auth.service.auth.resp.AuthUserInfoResp;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
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
    private final AuthUserIdResolver userIdResolver;

    @GetMapping("/info")
    public Result<AuthUserInfoResp> info(
        @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = userIdResolver.resolve(userIdHeader, authorization);
        return biz.getInfo(userId);
    }
}
