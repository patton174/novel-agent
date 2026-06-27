package cn.novelstudio.module.auth.service.impl;

import cn.novelstudio.module.auth.client.BillingReferralClient;
import cn.novelstudio.module.auth.client.BillingSettingsClient;
import cn.novelstudio.module.auth.client.BillingSubscriptionClient;
import cn.novelstudio.module.auth.dto.RegisterRequest;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.entity.InviteCodeEntity;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.module.auth.security.DeviceSessionService;
import cn.novelstudio.module.auth.security.JwtAuthService;
import cn.novelstudio.module.auth.security.WsTicketService;
import cn.novelstudio.module.auth.service.EmailVerificationService;
import cn.novelstudio.module.auth.service.InviteCodeService;
import cn.novelstudio.module.auth.service.RateLimitService;
import cn.novelstudio.module.auth.support.PermissionSyncPublisher;
import cn.novelstudio.module.risk.service.RiskSessionHooks;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplRegisterTest {

    @Mock
    private AuthUserRepository authUserRepository;
    @Mock
    private PermissionSyncPublisher permissionSyncPublisher;
    @Mock
    private JwtAuthService jwtAuthService;
    @Mock
    private DeviceSessionService deviceSessionService;
    @Mock
    private WsTicketService wsTicketService;
    @Mock
    private EmailVerificationService emailVerificationService;
    @Mock
    private RateLimitService rateLimitService;
    @Mock
    private BillingSubscriptionClient billingSubscriptionClient;
    @Mock
    private BillingSettingsClient billingSettingsClient;
    @Mock
    private BillingReferralClient billingReferralClient;
    @Mock
    private InviteCodeService inviteCodeService;
    @Mock
    private RiskSessionHooks riskSessionHooks;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
            authUserRepository,
            permissionSyncPublisher,
            jwtAuthService,
            deviceSessionService,
            wsTicketService,
            emailVerificationService,
            rateLimitService,
            billingSubscriptionClient,
            billingSettingsClient,
            billingReferralClient,
            inviteCodeService,
            riskSessionHooks
        );
    }

    @Test
    void registerRedeemsInviteCodeWhenProvided() {
        when(billingSettingsClient.isRegistrationEnabled()).thenReturn(true);
        when(billingSettingsClient.isRegistrationRequireEmailVerify()).thenReturn(true);
        when(authUserRepository.existsByUsername("writer1")).thenReturn(false);
        when(authUserRepository.existsByEmail("writer@example.com")).thenReturn(false);

        InviteCodeEntity invite = new InviteCodeEntity();
        invite.setId(100L);
        invite.setCode("NA-INV-TEST");
        when(inviteCodeService.requireValidForRegistration("NA-INV-TEST")).thenReturn(invite);

        RegisterRequest request = new RegisterRequest();
        request.setUsername("writer1");
        request.setPassword("secret12");
        request.setEmail("writer@example.com");
        request.setEmailCode("123456");
        request.setInviteCode("NA-INV-TEST");

        authService.register(request, "127.0.0.1", "fp-test", null);

        verify(inviteCodeService).requireValidForRegistration("NA-INV-TEST");
        ArgumentCaptor<AuthUser> userCaptor = ArgumentCaptor.forClass(AuthUser.class);
        verify(authUserRepository).save(userCaptor.capture());
        verify(inviteCodeService).redeemAfterRegistration(eq(invite), eq(userCaptor.getValue().getId()));
        verify(billingReferralClient).recordRegistrationAttribution(userCaptor.getValue().getId(), null);
    }

    @Test
    void registerSkipsInviteWhenBlank() {
        when(billingSettingsClient.isRegistrationEnabled()).thenReturn(true);
        when(billingSettingsClient.isRegistrationRequireEmailVerify()).thenReturn(true);
        when(authUserRepository.existsByUsername("writer2")).thenReturn(false);
        when(authUserRepository.existsByEmail("writer2@example.com")).thenReturn(false);

        RegisterRequest request = new RegisterRequest();
        request.setUsername("writer2");
        request.setPassword("secret12");
        request.setEmail("writer2@example.com");
        request.setEmailCode("123456");

        authService.register(request, "127.0.0.1", "fp-test", "ref-code");

        verify(inviteCodeService, never()).requireValidForRegistration(anyString());
        verify(inviteCodeService, never()).redeemAfterRegistration(any(), anyLong());
        verify(billingReferralClient).recordRegistrationAttribution(anyLong(), eq("ref-code"));
    }
}
