package cn.novelstudio.platform.mail.template;

import cn.novelstudio.platform.mail.config.EmailBrandProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 加载 MJML 编译产物（classpath:mail/*.html|txt），运行时注入品牌与业务变量。
 */
public class EmailTemplateRenderer {

    private final EmailBrandProperties brandProperties;

    public EmailTemplateRenderer(EmailBrandProperties brandProperties) {
        this.brandProperties = brandProperties;
    }

    public RenderedEmail render(String templateId, Map<String, String> extraVars, String subject) {
        Map<String, String> vars = new HashMap<>(brandProperties.toPlaceholderMap());
        if (extraVars != null) {
            vars.putAll(extraVars);
        }
        String html = applyPlaceholders(loadTemplate(templateId + ".html"), vars);
        String text = applyPlaceholders(loadTemplate(templateId + ".txt"), vars);
        return new RenderedEmail(subject, html, text);
    }

    public RenderedEmail renderVerifyLink(String verifyUrl, long ttlSeconds, String frontendBaseUrl) {
        Map<String, String> vars = new HashMap<>();
        vars.put("verifyUrl", verifyUrl);
        vars.put("ttlLabel", EmailTtlFormatter.formatLabel(ttlSeconds));
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            vars.put("frontendBaseUrl", frontendBaseUrl.replaceAll("/+$", ""));
        }
        return render(EmailTemplateIds.VERIFY_LINK, vars, brandProperties.getProductName() + " 邮箱验证");
    }

    public RenderedEmail renderPasswordResetLink(String resetUrl, long ttlSeconds, String frontendBaseUrl) {
        Map<String, String> vars = new HashMap<>();
        vars.put("resetUrl", resetUrl);
        vars.put("ttlLabel", EmailTtlFormatter.formatLabel(ttlSeconds));
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
            vars.put("frontendBaseUrl", frontendBaseUrl.replaceAll("/+$", ""));
        }
        return render(EmailTemplateIds.PASSWORD_RESET, vars, brandProperties.getProductName() + " 重置密码");
    }

    public RenderedEmail renderVerifyCode(String code, long ttlSeconds) {
        Map<String, String> vars = Map.of(
            "code", code,
            "ttlLabel", EmailTtlFormatter.formatLabel(ttlSeconds)
        );
        return render(EmailTemplateIds.VERIFY_CODE, vars, brandProperties.getProductName() + " 邮箱验证码");
    }

    private static String loadTemplate(String fileName) {
        try {
            ClassPathResource resource = new ClassPathResource("mail/" + fileName);
            try (InputStream in = resource.getInputStream()) {
                return StreamUtils.copyToString(in, StandardCharsets.UTF_8);
            }
        } catch (IOException ex) {
            throw new IllegalStateException(
                "邮件模板缺失: mail/" + fileName + "（请在 agent-common-mail/email-templates 运行 npm run build）",
                ex
            );
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
