package com.novel.agent.auth.controller.internal;

import com.novel.agent.auth.service.EmailLinkSecretService;
import com.novel.agent.common.service.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/auth")
@RequiredArgsConstructor
public class InternalAuthSecretsController extends BaseController {

    private final EmailLinkSecretService emailLinkSecretService;

    /** 部署脚本调用：确保 Redis 中存在邮箱验证链接密钥（幂等，不轮换 bootstrap）。 */
    @PostMapping("/ensure-email-link-secret")
    public EmailLinkSecretView ensureEmailLinkSecret() {
        return new EmailLinkSecretView(emailLinkSecretService.ensureSecret());
    }

    public record EmailLinkSecretView(String emailLinkSecret) {
    }
}
