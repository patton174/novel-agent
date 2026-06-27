package cn.novelstudio.platform.mail.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Year;
import java.util.HashMap;
import java.util.Map;

/**
 * 邮件品牌样式（运行时覆盖 MJML 模板中的 __key__ 占位符，无需重新编译模板）。
 */
@Data
@ConfigurationProperties(prefix = "mail.brand")
public class EmailBrandProperties {

    private String primary = "#1043ff";
    private String primaryDark = "#0a33cc";
    private String gradientEnd = "#1043ff";
    private String background = "#ededed";
    private String surface = "#ffffff";
    private String text = "#1a1a1a";
    private String muted = "#666666";
    private String border = "#000000";
    private String productName = "Novel Agent";
    /** 运行时由 {@link cn.novelstudio.platform.mail.template.EmailTemplateRenderer} 用 mail.brand.tagline 覆盖。 */
    private String tagline = "";
    private String logoUrl = "https://www.novel-agent.cn/favicon.svg";
    private String supportEmail = "hello@noreply.novel-agent.cn";
    private String frontendBaseUrl = "https://www.novel-agent.cn";

    public Map<String, String> toPlaceholderMap() {
        Map<String, String> ctx = new HashMap<>();
        ctx.put("brandPrimary", primary);
        ctx.put("brandPrimaryDark", primaryDark);
        ctx.put("brandGradientEnd", gradientEnd);
        ctx.put("brandBackground", background);
        ctx.put("brandSurface", surface);
        ctx.put("brandText", text);
        ctx.put("brandMuted", muted);
        ctx.put("brandBorder", border);
        ctx.put("productName", productName);
        ctx.put("tagline", tagline);
        ctx.put("logoUrl", logoUrl);
        ctx.put("supportEmail", supportEmail);
        ctx.put("frontendBaseUrl", normalizeBaseUrl(frontendBaseUrl));
        ctx.put("year", String.valueOf(Year.now().getValue()));
        return ctx;
    }

    private static String normalizeBaseUrl(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        return url.replaceAll("/+$", "");
    }
}
