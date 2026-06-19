package com.novel.agent.auth.service.api.biz;

import com.novel.agent.auth.dto.SendEmailCodeRequest;
import com.novel.agent.auth.service.EmailVerificationService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EmailVerificationBiz extends BaseBiz {

    private final EmailVerificationService emailVerificationService;

    public Result<Void> sendRegisterCode(SendEmailCodeRequest request, String ip, String fingerprint) {
        emailVerificationService.sendRegisterCode(request.getEmail(), request.getCaptchaToken(), ip, fingerprint);
        return ok(null);
    }
}
