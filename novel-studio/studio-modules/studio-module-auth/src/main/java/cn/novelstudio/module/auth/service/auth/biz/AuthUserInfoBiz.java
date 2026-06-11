package cn.novelstudio.module.auth.service.auth.biz;

import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.module.auth.service.auth.resp.AuthUserInfoResp;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthUserInfoBiz extends BaseBiz {

    private final AuthUserRepository authUserRepository;

    public Result<AuthUserInfoResp> getInfo(Long userId) {
        AuthUser user = authUserRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException(ResultCode.AUTH_USER_NOT_FOUND, "用户不存在"));
        return ok(new AuthUserInfoResp(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getRole(),
            user.getEmailVerified()
        ));
    }
}
