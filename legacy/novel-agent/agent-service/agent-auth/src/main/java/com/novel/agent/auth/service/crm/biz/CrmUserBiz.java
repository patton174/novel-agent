package com.novel.agent.auth.service.crm.biz;

import com.novel.agent.auth.client.BillingAuditClient;
import com.novel.agent.auth.dao.UserInfoDao;
import com.novel.agent.auth.entity.AuthUser;
import com.novel.agent.auth.security.DeviceSessionService;
import com.novel.agent.auth.support.PermissionSyncPublisher;
import com.novel.agent.auth.service.crm.req.CrmUserPageReq;
import com.novel.agent.auth.service.crm.req.CrmUserUpdateReq;
import com.novel.agent.auth.service.crm.resp.CrmUserDetailResp;
import com.novel.agent.auth.service.crm.resp.CrmUserItemResp;
import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.PageQuery;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.common.core.exception.ValidationException;
import com.novel.agent.common.service.utils.SpringPageSupport;
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
            .orElseThrow(() -> new NotFoundException(ResultCode.CRM_USER_NOT_FOUND, "用户不存在"));
        return ok(toDetail(user));
    }

    public Result<CrmUserDetailResp> update(Long id, CrmUserUpdateReq req, Long actorId) {
        validateRole(req.role());
        AuthUser before = userInfoDao.findById(id)
            .orElseThrow(() -> new NotFoundException(ResultCode.CRM_USER_NOT_FOUND, "用户不存在"));
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
            throw new ValidationException(ResultCode.AUTH_ROLE_INVALID, "不支持的角色: " + role);
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
