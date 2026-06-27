package cn.novelstudio.module.notification.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.notification.dto.InboxResp;
import cn.novelstudio.module.notification.dto.NotificationItemResp;
import cn.novelstudio.module.notification.dto.SendNotificationReq;
import cn.novelstudio.module.notification.dto.UnreadCountResp;
import cn.novelstudio.module.notification.entity.UserNotificationEntity;
import cn.novelstudio.module.notification.repository.UserNotificationRepository;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class NotificationBiz extends BaseBiz {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int BATCH_SIZE = 500;

    private final UserNotificationRepository notificationRepository;
    private final StudioMessages messages;

    public Result<InboxResp> listInbox(Long userId, Long cursor, Integer limit) {
        int size = normalizeLimit(limit);
        PageRequest page = PageRequest.of(0, size + 1);
        List<UserNotificationEntity> rows = cursor == null || cursor <= 0
            ? notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, page)
            : notificationRepository.findByUserIdAndIdLessThanOrderByCreatedAtDescIdDesc(userId, cursor, page);

        boolean hasMore = rows.size() > size;
        List<UserNotificationEntity> slice = hasMore ? rows.subList(0, size) : rows;
        List<NotificationItemResp> list = slice.stream().map(this::toItemResp).toList();
        Long nextCursor = list.isEmpty() ? null : list.get(list.size() - 1).id();

        return ok(new InboxResp(list, hasMore, nextCursor));
    }

    public Result<UnreadCountResp> unreadCount(Long userId) {
        long count = notificationRepository.countByUserIdAndReadAtIsNull(userId);
        return ok(new UnreadCountResp(count));
    }

    @Transactional
    public Result<Void> markRead(Long userId, Long notificationId) {
        UserNotificationEntity entity = notificationRepository.findByIdAndUserId(notificationId, userId)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.NOT_FOUND, "notification.not_found"));
        if (entity.getReadAt() == null) {
            entity.setReadAt(Instant.now());
            notificationRepository.save(entity);
        }
        return ok();
    }

    @Transactional
    public Result<Void> markAllRead(Long userId) {
        notificationRepository.markAllRead(userId, Instant.now());
        return ok();
    }

    @Transactional
    public Result<Long> send(SendNotificationReq req) {
        require(req.userId() != null && req.userId() > 0, ResultCode.BAD_REQUEST, "notification.invalid_user");
        require(hasText(req.category()), ResultCode.BAD_REQUEST, "notification.invalid_category");
        require(hasContent(req), ResultCode.BAD_REQUEST, "notification.empty_content");

        UserNotificationEntity saved = notificationRepository.save(toEntity(req.userId(), req));
        return ok(saved.getId());
    }

    /** Batch internal send: {@code template.userId} is ignored; one notification per target user. */
    @Transactional
    public Result<Integer> sendToUsers(List<Long> userIds, SendNotificationReq template) {
        require(hasText(template.category()), ResultCode.BAD_REQUEST, "notification.invalid_category");
        require(hasContent(template), ResultCode.BAD_REQUEST, "notification.empty_content");
        if (userIds == null || userIds.isEmpty()) {
            return ok(0);
        }

        List<UserNotificationEntity> batch = new ArrayList<>(Math.min(userIds.size(), BATCH_SIZE));
        int sent = 0;
        for (Long userId : userIds) {
            if (userId == null || userId <= 0) {
                continue;
            }
            batch.add(toEntity(userId, template));
            if (batch.size() >= BATCH_SIZE) {
                notificationRepository.saveAll(batch);
                sent += batch.size();
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            notificationRepository.saveAll(batch);
            sent += batch.size();
        }
        return ok(sent);
    }

    private static UserNotificationEntity toEntity(Long userId, SendNotificationReq req) {
        UserNotificationEntity entity = new UserNotificationEntity();
        entity.setUserId(userId);
        entity.setCategory(req.category().trim());
        entity.setTitleKey(trimToNull(req.titleKey()));
        entity.setBodyKey(trimToNull(req.bodyKey()));
        entity.setTitleText(trimToNull(req.titleText()));
        entity.setBodyText(trimToNull(req.bodyText()));
        entity.setPayloadJson(req.payload());
        return entity;
    }

    NotificationItemResp toItemResp(UserNotificationEntity entity) {
        Map<String, Object> payload = entity.getPayloadJson();
        return new NotificationItemResp(
            entity.getId(),
            entity.getCategory(),
            resolveTitle(entity, payload),
            resolveBody(entity, payload),
            payload,
            entity.getReadAt() != null,
            entity.getCreatedAt()
        );
    }

    String resolveTitle(UserNotificationEntity entity, Map<String, Object> payload) {
        String messageKey = localizedMessageKey(entity.getTitleKey(), "title");
        if (StringUtils.hasText(messageKey)) {
            String fallback = StringUtils.hasText(entity.getTitleText()) ? entity.getTitleText() : messageKey;
            return messages.getOrDefault(messageKey, fallback, messageArgs(payload));
        }
        return entity.getTitleText() == null ? "" : entity.getTitleText();
    }

    String resolveBody(UserNotificationEntity entity, Map<String, Object> payload) {
        String sourceKey = StringUtils.hasText(entity.getBodyKey()) ? entity.getBodyKey() : entity.getTitleKey();
        String messageKey = localizedMessageKey(sourceKey, "body");
        if (StringUtils.hasText(messageKey)) {
            String fallback = StringUtils.hasText(entity.getBodyText()) ? entity.getBodyText() : messageKey;
            return messages.getOrDefault(messageKey, fallback, messageArgs(payload));
        }
        return entity.getBodyText() == null ? "" : entity.getBodyText();
    }

    private static String localizedMessageKey(String key, String suffix) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        String trimmed = key.trim();
        if (trimmed.endsWith("." + suffix)) {
            return trimmed;
        }
        return trimmed + "." + suffix;
    }

    private static Object[] messageArgs(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return new Object[0];
        }
        Object orderId = payload.get("orderId");
        if (orderId != null) {
            return new Object[] { orderId };
        }
        return payload.values().toArray();
    }

    private static int normalizeLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(limit, MAX_PAGE_SIZE);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private static boolean hasContent(SendNotificationReq req) {
        return hasText(req.titleKey()) || hasText(req.bodyKey())
            || hasText(req.titleText()) || hasText(req.bodyText());
    }
}
