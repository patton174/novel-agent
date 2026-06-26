package cn.novelstudio.platform.mail.template;

import cn.novelstudio.platform.i18n.StudioMessages;
import cn.novelstudio.platform.mail.config.EmailBrandProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 加载 MJML 编译产物（classpath:mail/*.html|txt），运行时注入品牌与业务变量。
 */
@Slf4j
@Component
public class EmailTemplateRenderer {

    private final EmailBrandProperties brandProperties;
    private final StudioMessages messages;
    private final EmailTtlFormatter ttlFormatter;
    private final EmailTemplateContent templateContent;

    public EmailTemplateRenderer(
        EmailBrandProperties brandProperties,
        StudioMessages messages,
        EmailTtlFormatter ttlFormatter,
        EmailTemplateContent templateContent
    ) {
        this.brandProperties = brandProperties;
        this.messages = messages;
        this.ttlFormatter = ttlFormatter;
        this.templateContent = templateContent;
    }

    public RenderedEmail render(String templateId, Map<String, String> extraVars, String subject) {
        Map<String, String> vars = new HashMap<>(brandProperties.toPlaceholderMap());
        vars.put("tagline", messages.get("mail.brand.tagline"));
        if (extraVars != null) {
            vars.putAll(extraVars);
        }
        vars.putAll(templateContent.varsFor(templateId, brandProperties.getProductName(), vars));
        String html = applyPlaceholders(loadTemplate(templateId + ".html"), vars);
        String text = applyPlaceholders(loadTemplate(templateId + ".txt"), vars);
        return new RenderedEmail(subject, html, text);
    }

    public RenderedEmail renderVerifyLink(String verifyUrl, long ttlSeconds, String frontendBaseUrl) {
        Map<String, String> vars = new HashMap<>();
        vars.put("verifyUrl", verifyUrl);
        vars.put("ttlLabel", ttlFormatter.formatLabel(ttlSeconds));
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            vars.put("frontendBaseUrl", frontendBaseUrl.replaceAll("/+$", ""));
        }
        return render(
            EmailTemplateIds.VERIFY_LINK,
            vars,
            messages.get("mail.subject.verify_link", brandProperties.getProductName())
        );
    }

    public RenderedEmail renderPasswordResetLink(String resetUrl, long ttlSeconds, String frontendBaseUrl) {
        Map<String, String> vars = new HashMap<>();
        vars.put("resetUrl", resetUrl);
        vars.put("ttlLabel", ttlFormatter.formatLabel(ttlSeconds));
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            vars.put("frontendBaseUrl", frontendBaseUrl.replaceAll("/+$", ""));
        }
        return render(
            EmailTemplateIds.PASSWORD_RESET,
            vars,
            messages.get("mail.subject.password_reset", brandProperties.getProductName())
        );
    }

    public RenderedEmail renderVerifyCode(String code, long ttlSeconds) {
        Map<String, String> vars = Map.of(
            "code", code,
            "ttlLabel", ttlFormatter.formatLabel(ttlSeconds)
        );
        return render(
            EmailTemplateIds.VERIFY_CODE,
            vars,
            messages.get("mail.subject.verify_code", brandProperties.getProductName())
        );
    }

    private String loadTemplate(String fileName) {
        try {
            ClassPathResource resource = new ClassPathResource("mail/" + fileName);
            try (InputStream in = resource.getInputStream()) {
                return StreamUtils.copyToString(in, StandardCharsets.UTF_8);
            }
        } catch (IOException ex) {
            log.error("Missing mail template: mail/{}", fileName, ex);
            throw new IllegalStateException("mail.template.missing", ex);
        }
    }

    private static String applyPlaceholders(String template, Map<String, String> vars) {
        String out = template;
        for (Map.Entry<String, String> entry : vars.entrySet()) {
            out = out.replace("__" + entry.getKey() + "__", entry.getValue());
        }
        return out;
    }
}
