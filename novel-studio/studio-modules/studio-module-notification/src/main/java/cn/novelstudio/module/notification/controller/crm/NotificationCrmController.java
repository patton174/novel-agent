package cn.novelstudio.module.notification.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.notification.dto.BroadcastReq;
import cn.novelstudio.module.notification.dto.BroadcastResp;
import cn.novelstudio.module.notification.service.biz.NotificationCrmBiz;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notification/crm")
@RequiredArgsConstructor
public class NotificationCrmController extends BaseController {

    private final NotificationCrmBiz notificationCrmBiz;

    @PostMapping("/broadcast")
    public Result<BroadcastResp> broadcast(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody BroadcastReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return notificationCrmBiz.broadcast(req, parseOptionalUserId(actorHeader));
    }

    private static Long parseOptionalUserId(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
