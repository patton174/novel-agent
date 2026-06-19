package com.novel.agent.auth.service.auth.biz;

import com.novel.agent.auth.entity.AuthUser;
import com.novel.agent.auth.repository.AuthUserRepository;
import com.novel.agent.auth.service.auth.resp.AuthUserInfoResp;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.NotFoundException;
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
