package cn.novelstudio.platform.mail.template;

import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** 邮件正文文案（HTML/TXT 占位符），按当前请求 Locale 解析。 */
@Component
public class EmailTemplateContent {

    private final StudioMessages messages;

    public EmailTemplateContent(StudioMessages messages) {
        this.messages = messages;
    }

    public Map<String, String> varsFor(String templateId, String productName, Map<String, String> context) {
        Map<String, String> vars = new HashMap<>();
        String ttlLabel = context == null ? "" : context.getOrDefault("ttlLabel", "");
        String code = context == null ? "" : context.getOrDefault("code", "");
        Locale locale = LocaleContextHolder.getLocale();
        AppLocale appLocale = AppLocale.fromTag(locale.toLanguageTag());
        vars.put("mailLang", appLocale.tag());

        switch (templateId) {
            case EmailTemplateIds.VERIFY_LINK -> putVerifyLink(vars, productName, ttlLabel);
            case EmailTemplateIds.VERIFY_CODE -> putVerifyCode(vars, productName, ttlLabel, code);
            case EmailTemplateIds.PASSWORD_RESET -> putPasswordReset(vars, productName, ttlLabel);
            default -> { }
        }
        putFooter(vars, productName);
        return vars;
    }

    private void putVerifyLink(Map<String, String> vars, String productName, String ttlLabel) {
        vars.put("mailPageTitle", messages.get("mail.verify_link.page_title", productName));
        vars.put("mailPreheader", messages.get("mail.verify_link.preheader", ttlLabel));
        vars.put("mailAriaLabel", messages.get("mail.verify_link.aria_label", productName));
        vars.put("mailHeading", messages.get("mail.verify_link.heading"));
        vars.put("mailIntro", messages.get("mail.verify_link.intro", productName));
        vars.put("mailButtonText", messages.get("mail.verify_link.button"));
        vars.put("mailTtlHint", messages.get("mail.verify_link.ttl_hint", ttlLabel));
        vars.put("mailBackupLabel", messages.get("mail.verify_link.backup_label"));
        vars.put("mailIgnoreNotice", messages.get("mail.verify_link.ignore"));
        vars.put("mailHeadline", messages.get("mail.verify_link.headline"));
        vars.put("mailIntroBody", messages.get("mail.verify_link.txt_intro", ttlLabel));
        vars.put("mailIgnoreShort", messages.get("mail.verify_link.txt_ignore"));
    }

    private void putVerifyCode(Map<String, String> vars, String productName, String ttlLabel, String code) {
        vars.put("mailPageTitle", messages.get("mail.verify_code.page_title", productName));
        vars.put("mailPreheader", messages.get("mail.verify_code.preheader", code, ttlLabel));
        vars.put("mailAriaLabel", messages.get("mail.verify_code.aria_label", productName));
        vars.put("mailHeading", messages.get("mail.verify_code.heading"));
        vars.put("mailIntro", messages.get("mail.verify_code.intro", productName));
        vars.put("mailTtlSecurity", messages.get("mail.verify_code.ttl_security", ttlLabel));
        vars.put("mailIgnoreNotice", messages.get("mail.verify_code.ignore"));
        vars.put("mailHeadline", messages.get("mail.verify_code.headline"));
        vars.put("mailCodeLabel", messages.get("mail.verify_code.code_label"));
        vars.put("mailIgnoreShort", messages.get("mail.verify_code.txt_ignore"));
    }

    private void putPasswordReset(Map<String, String> vars, String productName, String ttlLabel) {
        vars.put("mailPageTitle", messages.get("mail.password_reset.page_title", productName));
        vars.put("mailPreheader", messages.get("mail.password_reset.preheader", ttlLabel));
        vars.put("mailAriaLabel", messages.get("mail.password_reset.aria_label", productName));
        vars.put("mailHeading", messages.get("mail.password_reset.heading"));
        vars.put("mailIntro", messages.get("mail.password_reset.intro", productName));
        vars.put("mailButtonText", messages.get("mail.password_reset.button"));
        vars.put("mailTtlHint", messages.get("mail.password_reset.ttl_hint", ttlLabel));
        vars.put("mailBackupLabel", messages.get("mail.password_reset.backup_label"));
        vars.put("mailIgnoreNotice", messages.get("mail.password_reset.ignore"));
        vars.put("mailHeadline", messages.get("mail.password_reset.headline"));
        vars.put("mailIntroBody", messages.get("mail.password_reset.txt_intro", productName));
        vars.put("mailActionIntro", messages.get("mail.password_reset.txt_action", ttlLabel));
        vars.put("mailIgnoreShort", messages.get("mail.password_reset.txt_ignore"));
    }

    private void putFooter(Map<String, String> vars, String productName) {
        vars.put("mailFooterAutoSent", messages.get("mail.footer.auto_sent", productName));
        vars.put("mailFooterContactLabel", messages.get("mail.footer.contact_label"));
    }
}
