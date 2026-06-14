package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.dto.ConfirmPasswordResetRequest;
import cn.novelstudio.module.auth.dto.ForgotPasswordRequest;
import cn.novelstudio.module.auth.service.api.biz.PasswordResetBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/api")
@RequiredArgsConstructor
public class PasswordResetController extends BaseController {

    private final PasswordResetBiz biz;

    @PostMapping("/forgot-password")
    public Result<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return biz.forgotPassword(request);
    }

    @PostMapping("/confirm-password-reset")
    public Result<Void> confirmPasswordReset(@Valid @RequestBody ConfirmPasswordResetRequest request) {
        return biz.confirmPasswordReset(request);
    }
}
