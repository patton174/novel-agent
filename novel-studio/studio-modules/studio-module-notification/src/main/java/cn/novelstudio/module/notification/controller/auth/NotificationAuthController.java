package cn.novelstudio.module.notification.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.notification.dto.InboxResp;
import cn.novelstudio.module.notification.dto.UnreadCountResp;
import cn.novelstudio.module.notification.service.biz.NotificationBiz;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notification/auth")
@RequiredArgsConstructor
public class NotificationAuthController extends BaseController {

    private final NotificationBiz notificationBiz;

    @GetMapping("/inbox")
    public Result<InboxResp> inbox(
        @RequestHeader("X-User-Id") String userIdHeader,
        @RequestParam(required = false) Long cursor,
        @RequestParam(required = false) Integer limit
    ) {
        return notificationBiz.listInbox(parseUserId(userIdHeader), cursor, limit);
    }

    @GetMapping("/unread-count")
    public Result<UnreadCountResp> unreadCount(@RequestHeader("X-User-Id") String userIdHeader) {
        return notificationBiz.unreadCount(parseUserId(userIdHeader));
    }

    @PostMapping("/{id}/read")
    public Result<Void> markRead(
        @RequestHeader("X-User-Id") String userIdHeader,
        @PathVariable long id
    ) {
        return notificationBiz.markRead(parseUserId(userIdHeader), id);
    }

    @PostMapping("/read-all")
    public Result<Void> markAllRead(@RequestHeader("X-User-Id") String userIdHeader) {
        return notificationBiz.markAllRead(parseUserId(userIdHeader));
    }
}
