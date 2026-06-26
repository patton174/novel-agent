package cn.novelstudio.platform.mail.config;

import cn.novelstudio.platform.mail.sender.MailtrapEmailSender;
import cn.novelstudio.platform.mail.template.EmailTemplateRenderer;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@ConditionalOnClass(MailtrapEmailSender.class)
@EnableConfigurationProperties({MailtrapProperties.class, EmailBrandProperties.class})
@ComponentScan(basePackages = "cn.novelstudio.platform.mail.template")
public class MailAutoConfiguration {

    @Bean
    public MailtrapEmailSender mailtrapEmailSender(
        MailtrapProperties mailtrapProperties,
        EmailTemplateRenderer emailTemplateRenderer
    ) {
        return new MailtrapEmailSender(mailtrapProperties, emailTemplateRenderer);
    }
}
