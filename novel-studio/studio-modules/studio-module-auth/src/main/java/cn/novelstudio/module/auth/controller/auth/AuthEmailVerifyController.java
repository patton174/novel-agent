package cn.novelstudio.module.auth.controller.auth;

import cn.novelstudio.module.auth.security.AuthUserIdResolver;
import cn.novelstudio.module.auth.service.auth.biz.AuthEmailVerifyBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/auth")
@RequiredArgsConstructor
public class AuthEmailVerifyController extends BaseController {

    private final AuthEmailVerifyBiz biz;
    private final AuthUserIdResolver userIdResolver;

    @PostMapping("/send-email-verify")
    public Result<Void> sendEmailVerify(
        @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
        @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return biz.sendVerifyLink(userIdResolver.resolve(userIdHeader, authorization));
    }
}
