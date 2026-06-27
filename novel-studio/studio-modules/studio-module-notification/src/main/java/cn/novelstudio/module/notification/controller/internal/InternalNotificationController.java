package cn.novelstudio.module.notification.controller.internal;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.notification.dto.SendNotificationReq;
import cn.novelstudio.module.notification.service.biz.NotificationBiz;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/notification")
@RequiredArgsConstructor
public class InternalNotificationController extends BaseController {

    private final NotificationBiz notificationBiz;

    @PostMapping("/send")
    public Result<Long> send(@Valid @RequestBody SendNotificationReq req) {
        return notificationBiz.send(req);
    }
}
