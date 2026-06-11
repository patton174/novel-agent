package cn.novelstudio.module.auth.service.api.biz;

import cn.novelstudio.module.auth.dto.SendEmailCodeRequest;
import cn.novelstudio.module.auth.service.EmailVerificationService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
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
