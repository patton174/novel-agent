package cn.novelstudio.module.auth.captcha;

import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.kernel.exception.ValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TurnstileVerificationServiceTest {

    @Test
    void skipsWhenDisabled() {
        VerificationProperties properties = new VerificationProperties();
        properties.setTurnstileEnabled(false);
        TurnstileVerificationService service = new TurnstileVerificationService(properties, new ObjectMapper());
        assertDoesNotThrow(() -> service.verifyIfEnabled(null, "127.0.0.1"));
    }

    @Test
    void requiresTokenWhenEnabled() {
        VerificationProperties properties = new VerificationProperties();
        properties.setTurnstileEnabled(true);
        properties.setTurnstileSiteKey("site-key");
        properties.setTurnstileSecretKey("test-secret");
        TurnstileVerificationService service = new TurnstileVerificationService(properties, new ObjectMapper());
        assertThrows(ValidationException.class, () -> service.verifyIfEnabled("", "127.0.0.1"));
    }

    @Test
    void disabledWithoutSiteKey() {
        VerificationProperties properties = new VerificationProperties();
        properties.setTurnstileEnabled(true);
        properties.setTurnstileSecretKey("test-secret");
        TurnstileVerificationService service = new TurnstileVerificationService(properties, new ObjectMapper());
        assertFalse(service.isEnabled());
    }
}
