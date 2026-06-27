package cn.novelstudio.module.risk.service;

import cn.novelstudio.module.risk.config.RiskProperties;
import cn.novelstudio.module.risk.model.RiskEvaluationContext;
import cn.novelstudio.module.risk.model.RiskEventType;
import cn.novelstudio.module.risk.store.RiskSessionStore;
import cn.novelstudio.platform.web.clientsecurity.ClientSecurityProperties;
import cn.novelstudio.platform.web.clientsecurity.DeviceSessionSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RiskEvaluationServiceTest {

    @Mock
    private RiskSessionStore riskSessionStore;
    @Mock
    private SessionChallengeService challengeService;
    @Mock
    private DeviceSessionSupport deviceSessionSupport;

    private RiskProperties properties;
    private RiskEvaluationService service;

    @BeforeEach
    void setUp() {
        properties = new RiskProperties();
        properties.setEnabled(true);
        properties.setStepUpThreshold(80);
        properties.setRevokeThreshold(95);
        properties.setMinSignalsForStepUp(2);
        ClientSecurityProperties clientSecurityProperties = new ClientSecurityProperties();
        clientSecurityProperties.setFingerprintTolerance(0.15);
        service = new RiskEvaluationService(
            properties,
            riskSessionStore,
            challengeService,
            deviceSessionSupport,
            clientSecurityProperties
        );
    }

    @Test
    void disabledReturnsZeroRisk() {
        properties.setEnabled(false);
        var result = service.evaluate(new RiskEvaluationContext(
            "sess_1",
            1L,
            "fp",
            "fp",
            "1.2.3.4",
            "CN",
            Map.of(),
            RiskEventType.HEARTBEAT
        ));
        assertFalse(result.challengeRequired());
        verify(challengeService, never()).markChallengeRequired(anyString(), any());
    }

    @Test
    void webdriverAloneDoesNotStepUp() {
        var result = service.evaluate(new RiskEvaluationContext(
            "sess_1",
            1L,
            "fp",
            "fp",
            "1.2.3.4",
            "CN",
            Map.of("webdriver", true),
            RiskEventType.HEARTBEAT
        ));
        assertFalse(result.challengeRequired());
        assertTrue(result.score() < properties.stepUpThreshold());
    }
}
