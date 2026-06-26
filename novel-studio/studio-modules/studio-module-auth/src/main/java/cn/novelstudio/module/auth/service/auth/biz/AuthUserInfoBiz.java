package cn.novelstudio.module.auth.service.auth.biz;

import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.module.auth.service.auth.req.PixelAvatarPrefsReq;
import cn.novelstudio.module.auth.service.auth.resp.AuthUserInfoResp;
import cn.novelstudio.module.auth.service.auth.resp.PixelAvatarPrefsResp;
import cn.novelstudio.module.auth.support.UserUiPrefsSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class AuthUserInfoBiz extends BaseBiz {

    private final AuthUserRepository authUserRepository;
    private final UserUiPrefsSupport uiPrefsSupport;

    public Result<AuthUserInfoResp> getInfo(Long userId) {
        AuthUser user = requireUser(userId);
        return ok(toInfoResp(user));
    }

    public Result<PixelAvatarPrefsResp> getPixelAvatar(Long userId) {
        AuthUser user = requireUser(userId);
        PixelAvatarPrefsResp prefs = uiPrefsSupport.readPixelAvatar(user.getUiPrefs());
        return ok(prefs);
    }

    @Transactional
    public Result<PixelAvatarPrefsResp> savePixelAvatar(Long userId, PixelAvatarPrefsReq req) {
        validatePixelAvatar(req);
        AuthUser user = requireUser(userId);
        user.setUiPrefs(uiPrefsSupport.mergePixelAvatar(user.getUiPrefs(), req));
        authUserRepository.save(user);
        return ok(uiPrefsSupport.readPixelAvatar(user.getUiPrefs()));
    }

    private AuthUser requireUser(Long userId) {
        return authUserRepository.findById(userId)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.AUTH_USER_NOT_FOUND, ResultCode.AUTH_USER_NOT_FOUND.getMessageKey()));
    }

    private AuthUserInfoResp toInfoResp(AuthUser user) {
        return new AuthUserInfoResp(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getRole(),
            user.getEmailVerified(),
            uiPrefsSupport.readPixelAvatar(user.getUiPrefs())
        );
    }

    private void validatePixelAvatar(PixelAvatarPrefsReq req) {
        if (req == null) {
            throw ValidationException.keyed("validation.avatar.seed_required");
        }
        if (req.style() == null || req.style().isBlank()) {
            throw ValidationException.keyed("validation.avatar.style_required");
        }
        if (req.presetId() == null || req.presetId().isBlank()) {
            throw ValidationException.keyed("validation.avatar.palette_required");
        }
    }
}
