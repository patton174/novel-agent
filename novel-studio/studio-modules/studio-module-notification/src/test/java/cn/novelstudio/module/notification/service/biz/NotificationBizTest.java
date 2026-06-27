package cn.novelstudio.module.notification.service.biz;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.notification.dto.InboxResp;
import cn.novelstudio.module.notification.dto.NotificationItemResp;
import cn.novelstudio.module.notification.dto.SendNotificationReq;
import cn.novelstudio.module.notification.dto.UnreadCountResp;
import cn.novelstudio.module.notification.entity.UserNotificationEntity;
import cn.novelstudio.module.notification.repository.UserNotificationRepository;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationBizTest {

    @AfterEach
    void tearDown() {
        LocaleContext.clear();
    }

    @Test
    void listInbox_resolvesTitleAndBodyFromMessageKeys() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(messages.getOrDefault(anyString(), anyString(), any())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            if ("notification.billing.payment_success.title".equals(key)) {
                return "Payment successful";
            }
            if ("notification.billing.payment_success.body".equals(key)) {
                return "Order ORD-1 has been paid successfully.";
            }
            return inv.getArgument(1);
        });

        UserNotificationEntity entity = keyedNotification(11L, 42L);
        when(repository.findByUserIdOrderByCreatedAtDescIdDesc(eq(42L), any(Pageable.class)))
            .thenReturn(List.of(entity));

        LocaleContext.set(AppLocale.EN);
        NotificationBiz biz = new NotificationBiz(repository, messages);

        InboxResp inbox = biz.listInbox(42L, null, 20).data();

        NotificationItemResp item = inbox.list().getFirst();
        assertThat(item.title()).isEqualTo("Payment successful");
        assertThat(item.body()).isEqualTo("Order ORD-1 has been paid successfully.");
        assertThat(item.payload()).containsEntry("orderId", "ORD-1");
        assertThat(item.read()).isFalse();
        assertThat(inbox.hasMore()).isFalse();
    }

    @Test
    void unreadCount_returnsRepositoryCount() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(repository.countByUserIdAndReadAtIsNull(7L)).thenReturn(3L);

        NotificationBiz biz = new NotificationBiz(repository, messages);

        UnreadCountResp resp = biz.unreadCount(7L).data();

        assertThat(resp.count()).isEqualTo(3L);
    }

    @Test
    void markRead_requiresOwnership() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(repository.findByIdAndUserId(5L, 9L)).thenReturn(Optional.empty());

        NotificationBiz biz = new NotificationBiz(repository, messages);

        assertThatThrownBy(() -> biz.markRead(9L, 5L))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void markRead_setsReadAtWhenUnread() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        UserNotificationEntity entity = keyedNotification(5L, 9L);
        when(repository.findByIdAndUserId(5L, 9L)).thenReturn(Optional.of(entity));

        NotificationBiz biz = new NotificationBiz(repository, messages);
        biz.markRead(9L, 5L);

        assertThat(entity.getReadAt()).isNotNull();
        verify(repository).save(entity);
    }

    @Test
    void sendToUsers_persistsOneNotificationPerTargetUser() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        NotificationBiz biz = new NotificationBiz(repository, messages);
        SendNotificationReq template = new SendNotificationReq(
            0L,
            "monitoring",
            "notification.monitoring.alert",
            null,
            "CPU high",
            "CPU usage exceeded 90%",
            Map.of("cpuPercent", 95)
        );

        Integer sent = biz.sendToUsers(List.of(10L, 20L, 30L), template).data();

        assertThat(sent).isEqualTo(3);
        verify(repository).saveAll(any());
    }

    @Test
    void send_persistsKeyedNotification() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(repository.save(any(UserNotificationEntity.class))).thenAnswer(inv -> {
            UserNotificationEntity saved = inv.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        NotificationBiz biz = new NotificationBiz(repository, messages);
        SendNotificationReq req = new SendNotificationReq(
            42L,
            "billing",
            "notification.billing.payment_success",
            null,
            null,
            null,
            Map.of("orderId", "ORD-9")
        );

        Long id = biz.send(req).data();

        assertThat(id).isEqualTo(100L);
        verify(repository).save(any(UserNotificationEntity.class));
    }

    @Test
    void resolveTitle_fallsBackToPlainTextWhenKeyMissing() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(messages.getOrDefault(anyString(), anyString(), any())).thenAnswer(inv -> inv.getArgument(1));

        NotificationBiz biz = new NotificationBiz(repository, messages);
        UserNotificationEntity entity = new UserNotificationEntity();
        entity.setTitleText("Plain title");
        entity.setBodyText("Plain body");

        assertThat(biz.resolveTitle(entity, Map.of())).isEqualTo("Plain title");
        assertThat(biz.resolveBody(entity, Map.of())).isEqualTo("Plain body");
        verify(messages, never()).get(anyString());
    }

    @Test
    void listInbox_resolvesBodyFromTitleKeyBaseWhenBodyKeyMissing() {
        UserNotificationRepository repository = mock(UserNotificationRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        when(messages.getOrDefault(eq("notification.billing.payment_success.title"), anyString(), any()))
            .thenReturn("Payment successful");
        when(messages.getOrDefault(eq("notification.billing.payment_success.body"), anyString(), any()))
            .thenReturn("Order 9001 paid");

        UserNotificationEntity entity = new UserNotificationEntity();
        entity.setId(1L);
        entity.setUserId(42L);
        entity.setCategory("billing");
        entity.setTitleKey("notification.billing.payment_success");
        entity.setPayloadJson(Map.of("orderId", 9001L));
        entity.setCreatedAt(Instant.parse("2026-06-26T00:00:00Z"));
        when(repository.findByUserIdOrderByCreatedAtDescIdDesc(eq(42L), any(Pageable.class)))
            .thenReturn(List.of(entity));

        NotificationBiz biz = new NotificationBiz(repository, messages);
        NotificationItemResp item = biz.listInbox(42L, null, 20).data().list().getFirst();

        assertThat(item.title()).isEqualTo("Payment successful");
        assertThat(item.body()).isEqualTo("Order 9001 paid");
    }

    private static UserNotificationEntity keyedNotification(long id, long userId) {
        UserNotificationEntity entity = new UserNotificationEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setCategory("billing");
        entity.setTitleKey("notification.billing.payment_success");
        entity.setBodyKey("notification.billing.payment_success");
        entity.setPayloadJson(Map.of("orderId", "ORD-1"));
        entity.setCreatedAt(Instant.parse("2026-06-26T00:00:00Z"));
        return entity;
    }
}
