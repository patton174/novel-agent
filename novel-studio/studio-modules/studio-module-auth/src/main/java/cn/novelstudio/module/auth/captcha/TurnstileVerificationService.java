package cn.novelstudio.module.auth.captcha;

import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Service
public class TurnstileVerificationService {

    private static final URI SITE_VERIFY_URI = URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify");

    private final VerificationProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    public TurnstileVerificationService(VerificationProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isEnabled() {
        return properties.isTurnstileEnabled()
            && hasText(properties.getTurnstileSiteKey())
            && hasText(properties.getTurnstileSecretKey());
    }

    public String publicSiteKey() {
        return isEnabled() ? properties.getTurnstileSiteKey().trim() : "";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public void verifyRequired(String turnstileToken, String remoteIp) {
        if (!isEnabled()) {
            log.debug("Turnstile not configured, skip server verify");
            return;
        }
        if (turnstileToken == null || turnstileToken.isBlank()) {
            throw ValidationException.keyed(ResultCode.CAPTCHA_INVALID, "validation.captcha.turnstile_required");
        }
        verifyWithCloudflare(turnstileToken, remoteIp);
    }

    public void verifyIfEnabled(String turnstileToken, String remoteIp) {
        verifyRequired(turnstileToken, remoteIp);
    }

    private void verifyWithCloudflare(String turnstileToken, String remoteIp) {
        try {
            StringBuilder body = new StringBuilder();
            body.append("secret=").append(urlEncode(properties.getTurnstileSecretKey().trim()));
            body.append("&response=").append(urlEncode(turnstileToken.trim()));
            if (remoteIp != null && !remoteIp.isBlank()) {
                body.append("&remoteip=").append(urlEncode(remoteIp.trim()));
            }
            HttpRequest request = HttpRequest.newBuilder(SITE_VERIFY_URI)
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Turnstile siteverify HTTP {}", response.statusCode());
                throw ValidationException.keyed(ResultCode.CAPTCHA_INVALID, "validation.captcha.turnstile_retry");
            }
            JsonNode json = objectMapper.readTree(response.body());
            if (!json.path("success").asBoolean(false)) {
                log.debug("Turnstile rejected: {}", json.path("error-codes"));
                throw ValidationException.keyed(ResultCode.CAPTCHA_INVALID, "validation.captcha.turnstile_retry");
            }
        } catch (ValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Turnstile verify error: {}", ex.getMessage());
            throw ValidationException.keyed(ResultCode.CAPTCHA_INVALID, "validation.captcha.turnstile_unavailable");
        }
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
