package cn.novelstudio.module.auth.captcha;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class CaptchaTokenBindingTest {

    @Test
    void normalizesEmailBeforeHash() {
        String a = CaptchaTokenBinding.hashEmail("User@Example.COM");
        String b = CaptchaTokenBinding.hashEmail("user@example.com");
        assertEquals(a, b);
    }

    @Test
    void differentEmailsProduceDifferentHashes() {
        String a = CaptchaTokenBinding.hashEmail("a@example.com");
        String b = CaptchaTokenBinding.hashEmail("b@example.com");
        assertNotEquals(a, b);
    }
}
