package cn.novelstudio.module.auth.service.api.biz;

import cn.novelstudio.module.auth.dto.ConfirmPasswordResetRequest;
import cn.novelstudio.module.auth.dto.ForgotPasswordRequest;
import cn.novelstudio.module.auth.service.PasswordResetService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordResetBiz extends BaseBiz {

    private final PasswordResetService passwordResetService;

    public Result<Void> forgotPassword(ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.getEmail(), request.getCaptchaToken());
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
