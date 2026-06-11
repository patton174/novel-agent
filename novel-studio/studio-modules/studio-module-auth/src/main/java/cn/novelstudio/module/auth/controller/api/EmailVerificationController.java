package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.dto.ConfirmEmailVerifyRequest;
import cn.novelstudio.module.auth.dto.SendEmailCodeRequest;
import cn.novelstudio.module.auth.service.api.biz.EmailVerificationBiz;
import cn.novelstudio.module.auth.service.auth.biz.AuthEmailVerifyBiz;
import cn.novelstudio.module.auth.support.ClientRequestSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
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
