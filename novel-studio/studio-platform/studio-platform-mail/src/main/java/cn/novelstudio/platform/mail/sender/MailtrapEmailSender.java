package cn.novelstudio.platform.mail.sender;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.platform.mail.config.MailtrapProperties;
import cn.novelstudio.platform.mail.template.EmailTemplateRenderer;
import cn.novelstudio.platform.mail.template.RenderedEmail;
import io.mailtrap.client.MailtrapClient;
import io.mailtrap.config.MailtrapConfig;
import io.mailtrap.factory.MailtrapClientFactory;
import io.mailtrap.model.request.emails.Address;
import io.mailtrap.model.request.emails.MailtrapMail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

public class MailtrapEmailSender {

    private static final Logger log = LoggerFactory.getLogger(MailtrapEmailSender.class);

    private final MailtrapProperties properties;
    private final EmailTemplateRenderer templateRenderer;

    public MailtrapEmailSender(MailtrapProperties properties, EmailTemplateRenderer templateRenderer) {
        this.properties = properties;
        this.templateRenderer = templateRenderer;
    }

    public void sendVerificationLink(String toEmail, String verifyUrl, long ttlSeconds, String frontendBaseUrl) {
        RenderedEmail rendered = templateRenderer.renderVerifyLink(verifyUrl, ttlSeconds, frontendBaseUrl);
        send(toEmail, rendered, "email-verification");
    }

    public void sendPasswordResetLink(String toEmail, String resetUrl, long ttlSeconds, String frontendBaseUrl) {
        RenderedEmail rendered = templateRenderer.renderPasswordResetLink(resetUrl, ttlSeconds, frontendBaseUrl);
        send(toEmail, rendered, "password-reset");
    }

    public void sendVerificationCode(String toEmail, String code, long ttlSeconds) {
        RenderedEmail rendered = templateRenderer.renderVerifyCode(code, ttlSeconds);
        send(toEmail, rendered, "email-verification");
    }

    public void send(String toEmail, RenderedEmail rendered, String category) {
        if (!properties.enabled()) {
            log.error("Mailtrap token 未配置，无法发信 email={} subject={}", maskEmail(toEmail), rendered.subject());
            throw BizException.of(ResultCode.EMAIL_SEND_FAILED);
        }
        MailtrapConfig config = new MailtrapConfig.Builder()
            .token(properties.getToken())
            .build();
        MailtrapClient client = MailtrapClientFactory.createMailtrapClient(config);
        MailtrapMail mail = MailtrapMail.builder()
            .from(new Address(properties.getFromEmail(), properties.getFromName()))
            .to(List.of(new Address(toEmail)))
            .subject(rendered.subject())
            .html(rendered.html())
            .text(rendered.text())
            .category(category)
            .build();
        try {
            client.send(mail);
        } catch (Exception ex) {
            log.error("Mailtrap 发信失败 email={}: {}", maskEmail(toEmail), ex.getMessage());
            throw BizException.of(ResultCode.EMAIL_SEND_FAILED);
        }
    }

    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
