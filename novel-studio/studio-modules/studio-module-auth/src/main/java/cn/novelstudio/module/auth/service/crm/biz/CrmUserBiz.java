package cn.novelstudio.module.auth.service.crm.biz;

import cn.novelstudio.module.auth.client.BillingAuditClient;
import cn.novelstudio.module.auth.dao.UserInfoDao;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.security.DeviceSessionService;
import cn.novelstudio.module.auth.support.PermissionSyncPublisher;
import cn.novelstudio.module.auth.service.crm.req.CrmUserPageReq;
import cn.novelstudio.module.auth.service.crm.req.CrmUserUpdateReq;
import cn.novelstudio.module.auth.service.crm.resp.CrmUserDetailResp;
import cn.novelstudio.module.auth.service.crm.resp.CrmUserItemResp;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.PageQuery;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.web.utils.SpringPageSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
public class CrmUserBiz extends BaseBiz {

    private static final Set<String> ALLOWED_ROLES = Set.of("user", "vip", "admin");

    private final UserInfoDao userInfoDao;
    private final DeviceSessionService deviceSessionService;
    private final PermissionSyncPublisher permissionSyncPublisher;
    private final BillingAuditClient billingAuditClient;

    public Result<Page<CrmUserItemResp>> page(CrmUserPageReq req) {
        PageQuery query = pageQuery(req.pageCurrent(), req.pageSize());
        org.springframework.data.domain.Page<AuthUser> page = userInfoDao.pageByKeyword(
            req.usernameKeyword(),
            query.pageCurrent(),
            query.pageSize()
        );
        return ok(SpringPageSupport.map(page, this::toItem, query.pageCurrent(), query.pageSize()));
    }

    public Result<CrmUserDetailResp> detail(Long id) {
        AuthUser user = userInfoDao.findById(id)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.CRM_USER_NOT_FOUND, ResultCode.CRM_USER_NOT_FOUND.getMessageKey()));
        return ok(toDetail(user));
    }

    public Result<CrmUserDetailResp> update(Long id, CrmUserUpdateReq req, Long actorId) {
        validateRole(req.role());
        AuthUser before = userInfoDao.findById(id)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.CRM_USER_NOT_FOUND, ResultCode.CRM_USER_NOT_FOUND.getMessageKey()));
        userInfoDao.updateRoleAndStatus(id, req.role(), req.isActive());
        if (Boolean.FALSE.equals(req.isActive())) {
            deviceSessionService.revokeSessionsForUser(id);
        }
        permissionSyncPublisher.publish(id, req.role());
        if (actorId != null && !before.getRole().equals(req.role())) {
            billingAuditClient.logRoleChange(actorId, id, before.getRole(), req.role());
        }
        return detail(id);
    }

    private void validateRole(String role) {
        if (role == null || !ALLOWED_ROLES.contains(role)) {
            throw ValidationException.keyed(ResultCode.AUTH_ROLE_INVALID, "auth.crm.unsupported_role", role);
        }
    }

    private CrmUserItemResp toItem(AuthUser user) {
        return new CrmUserItemResp(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getRole(),
            user.getIsActive(),
            user.getEmailVerified()
        );
    }

    private CrmUserDetailResp toDetail(AuthUser user) {
        return new CrmUserDetailResp(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getRole(),
            user.getIsActive(),
            user.getEmailVerified()
        );
    }
}
