package cn.novelstudio.module.auth.service.auth.biz;

import cn.novelstudio.module.auth.dto.ConfirmEmailVerifyRequest;
import cn.novelstudio.module.auth.service.EmailVerificationService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
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
