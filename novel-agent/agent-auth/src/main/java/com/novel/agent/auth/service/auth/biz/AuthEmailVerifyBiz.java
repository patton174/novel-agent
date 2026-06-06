package com.novel.agent.auth.service.auth.biz;

import com.novel.agent.auth.dto.ConfirmEmailVerifyRequest;
import com.novel.agent.auth.service.EmailVerificationService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthEmailVerifyBiz extends BaseBiz {

    private final EmailVerificationService emailVerificationService;

    public Result<Void> sendVerifyLink(Long userId) {
        emailVerificationService.sendAccountVerifyLink(userId);
        return ok(null);
    }

    public Result<Void> confirmVerifyLink(ConfirmEmailVerifyRequest request) {
        emailVerificationService.confirmAccountVerifyLink(
            request.getToken(),
            request.getSig(),
            request.getExp()
        );
        return ok(null);
    }
}
