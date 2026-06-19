package com.novel.agent.auth.controller.api;

import com.novel.agent.auth.dto.ConfirmPasswordResetRequest;
import com.novel.agent.auth.dto.ForgotPasswordRequest;
import com.novel.agent.auth.service.api.biz.PasswordResetBiz;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
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
