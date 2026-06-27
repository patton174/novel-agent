package cn.novelstudio.module.notification.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.notification.dto.BroadcastReq;
import cn.novelstudio.module.notification.dto.BroadcastResp;
import cn.novelstudio.module.notification.entity.UserNotificationEntity;
import cn.novelstudio.module.notification.repository.UserNotificationRepository;
import cn.novelstudio.module.notification.support.NotificationUserDirectory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class NotificationCrmBiz extends BaseBiz {

    private static final int BATCH_SIZE = 500;
    private static final String DEFAULT_BROADCAST_CATEGORY = "admin_broadcast";

    private final UserNotificationRepository notificationRepository;
    private final NotificationUserDirectory userDirectory;
    private final AuditLogService auditLogService;

    @Transactional
    public Result<BroadcastResp> broadcast(BroadcastReq req, Long actorId) {
        String title = req.title().trim();
        String body = req.body().trim();
        require(StringUtils.hasText(title), ResultCode.BAD_REQUEST, "notification.broadcast.title_required");
        require(StringUtils.hasText(body), ResultCode.BAD_REQUEST, "notification.broadcast.body_required");

        String category = StringUtils.hasText(req.category()) ? req.category().trim() : DEFAULT_BROADCAST_CATEGORY;
        List<Long> userIds = userDirectory.listActiveUserIds();
        if (userIds.isEmpty()) {
            return ok(new BroadcastResp(0));
        }

        List<UserNotificationEntity> batch = new ArrayList<>(Math.min(userIds.size(), BATCH_SIZE));
        for (Long userId : userIds) {
            UserNotificationEntity entity = new UserNotificationEntity();
            entity.setUserId(userId);
            entity.setCategory(category);
            entity.setTitleText(title);
            entity.setBodyText(body);
            batch.add(entity);
            if (batch.size() >= BATCH_SIZE) {
                notificationRepository.saveAll(batch);
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            notificationRepository.saveAll(batch);
        }

        auditLogService.log(
            actorId,
            "notification.broadcast",
            "notification",
            "all",
            null,
            Map.of(
                "category", category,
                "title", title,
                "recipientCount", userIds.size()
            )
        );

        return ok(new BroadcastResp(userIds.size()));
    }
}
