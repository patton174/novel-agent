package com.novel.agent.auth.service;

import com.novel.agent.auth.config.MailtrapProperties;
import io.mailtrap.client.MailtrapClient;
import io.mailtrap.config.MailtrapConfig;
import io.mailtrap.factory.MailtrapClientFactory;
import io.mailtrap.model.request.emails.Address;
import io.mailtrap.model.request.emails.MailtrapMail;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class MailtrapEmailSender {

    private final MailtrapProperties properties;

    public MailtrapEmailSender(MailtrapProperties properties) {
        this.properties = properties;
    }

    public void sendVerificationCode(String toEmail, String code) {
        if (!properties.enabled()) {
            log.warn("Mailtrap token 未配置，跳过发信 email={} code={}", maskEmail(toEmail), code);
            return;
        }
        MailtrapConfig config = new MailtrapConfig.Builder()
            .token(properties.getToken())
            .build();
        MailtrapClient client = MailtrapClientFactory.createMailtrapClient(config);
        MailtrapMail mail = MailtrapMail.builder()
            .from(new Address(properties.getFromEmail(), properties.getFromName()))
            .to(List.of(new Address(toEmail)))
            .subject("Novel Agent 邮箱验证码")
            .text("您的验证码是：" + code + "，10 分钟内有效。如非本人操作请忽略。")
            .category("email-verification")
            .build();
        try {
            client.send(mail);
        } catch (Exception ex) {
            log.error("Mailtrap 发信失败 email={}: {}", maskEmail(toEmail), ex.getMessage());
            throw new RuntimeException("邮件发送失败，请稍后再试");
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
