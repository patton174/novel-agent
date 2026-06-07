package com.novel.agent.auth.controller.api;

import com.novel.agent.auth.dto.ConfirmEmailVerifyRequest;
import com.novel.agent.auth.dto.SendEmailCodeRequest;
import com.novel.agent.auth.service.api.biz.EmailVerificationBiz;
import com.novel.agent.auth.service.auth.biz.AuthEmailVerifyBiz;
import com.novel.agent.auth.support.ClientRequestSupport;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/api")
@RequiredArgsConstructor
public class EmailVerificationController extends BaseController {

    private final EmailVerificationBiz biz;
    private final AuthEmailVerifyBiz authEmailVerifyBiz;
    private final ClientRequestSupport clientRequestSupport;

    @PostMapping("/send-email-code")
    public Result<Void> sendEmailCode(@Valid @RequestBody SendEmailCodeRequest request, HttpServletRequest httpRequest) {
        String ip = clientRequestSupport.clientIp(httpRequest);
        String fingerprint = request.getFingerprint() != null && !request.getFingerprint().isBlank()
            ? request.getFingerprint()
            : clientRequestSupport.fingerprint(httpRequest);
        return biz.sendRegisterCode(request, ip, fingerprint);
    }

    @PostMapping("/confirm-email-verify")
    public Result<Void> confirmEmailVerify(@Valid @RequestBody ConfirmEmailVerifyRequest request) {
        return authEmailVerifyBiz.confirmVerifyLink(request);
    }
}
