package cn.novelstudio.platform.i18n;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.i18n")
public class I18nProperties {

    /** 是否启用 Result 响应 msg 本地化 */
    private boolean enabled = true;

    /** 翻译 API 基址（LibreTranslate 兼容：POST {baseUrl}/translate） */
    private String translationBaseUrl = "";

    /** 翻译 API Key（可选，写入 Authorization: Bearer） */
    private String translationApiKey = "";

    /** 是否在管理台保存站点内容时自动翻译到 en */
    private boolean autoTranslateSiteContent = true;

    /** Redis 缓存翻译结果 TTL（秒），0 表示仅用内存 */
    private long translationCacheSeconds = 86_400L;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getTranslationBaseUrl() {
        return translationBaseUrl;
    }

    public void setTranslationBaseUrl(String translationBaseUrl) {
        this.translationBaseUrl = translationBaseUrl;
    }

    public String getTranslationApiKey() {
        return translationApiKey;
    }

    public void setTranslationApiKey(String translationApiKey) {
        this.translationApiKey = translationApiKey;
    }

    public boolean isAutoTranslateSiteContent() {
        return autoTranslateSiteContent;
    }

    public void setAutoTranslateSiteContent(boolean autoTranslateSiteContent) {
        this.autoTranslateSiteContent = autoTranslateSiteContent;
    }

    public long getTranslationCacheSeconds() {
        return translationCacheSeconds;
    }

    public void setTranslationCacheSeconds(long translationCacheSeconds) {
        this.translationCacheSeconds = translationCacheSeconds;
    }

    public boolean isTranslationConfigured() {
        return translationBaseUrl != null && !translationBaseUrl.isBlank();
    }
}
