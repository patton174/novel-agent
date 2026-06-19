package com.novel.agent.auth.service.api.biz;

import com.novel.agent.auth.dto.ConfirmPasswordResetRequest;
import com.novel.agent.auth.dto.ForgotPasswordRequest;
import com.novel.agent.auth.service.PasswordResetService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordResetBiz extends BaseBiz {

    private final PasswordResetService passwordResetService;

    public Result<Void> forgotPassword(ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.getEmail());
        return ok(null);
    }

    public Result<Void> confirmPasswordReset(ConfirmPasswordResetRequest request) {
        passwordResetService.confirmPasswordReset(
            request.getToken(),
            request.getSig(),
            request.getExp(),
            request.getNewPassword()
        );
        return ok(null);
    }
}
