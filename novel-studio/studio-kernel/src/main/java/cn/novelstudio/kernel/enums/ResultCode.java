package cn.novelstudio.kernel.enums;

import java.util.Arrays;
import java.util.Optional;

/**
 * 统一错误码：{@code code} 写入 Result 响应体；{@code httpStatus} 映射 HTTP 状态。
 * {@code messageKey} 供 i18n MessageSource 解析（见 studio-platform-i18n）。
 */
public enum ResultCode {

    SUCCESS(200, 200, "result.success", "success"),
    BAD_REQUEST(400, 400, "result.bad_request", "参数无效"),
    UNAUTHORIZED(401, 401, "result.unauthorized", "未登录或登录已过期"),
    FORBIDDEN(403, 403, "result.forbidden", "无权访问"),
    NOT_FOUND(404, 404, "result.not_found", "资源不存在"),
    TOO_MANY_REQUESTS(429, 429, "result.too_many_requests", "请求过于频繁"),
    ERROR(500, 500, "result.error", "系统错误"),

    // auth 1001-1099
    AUTH_USER_NOT_FOUND(1001, 404, "result.auth.user_not_found", "用户不存在"),
    AUTH_LOGIN_FAILED(1002, 401, "result.auth.login_failed", "用户名或密码错误"),
    AUTH_USER_DISABLED(1003, 403, "result.auth.user_disabled", "账号已被禁用"),
    AUTH_EMAIL_NOT_VERIFIED(1004, 400, "result.auth.email_not_verified", "请先验证邮箱后再登录"),
    AUTH_USERNAME_EXISTS(1005, 400, "result.auth.username_exists", "用户名已存在"),
    AUTH_EMAIL_EXISTS(1006, 400, "result.auth.email_exists", "邮箱已被注册"),
    AUTH_TOKEN_EXPIRED(1007, 401, "result.auth.token_expired", "登录已过期，请重新登录"),
    AUTH_ROLE_INVALID(1008, 400, "result.auth.role_invalid", "不支持的角色"),
    AUTH_REGISTRATION_DISABLED(1009, 503, "result.auth.registration_disabled", "注册功能暂时关闭，请稍后再试"),

    // captcha / 邮箱 1101-1199
    CAPTCHA_INVALID(1101, 400, "result.captcha.invalid", "验证码无效或已过期"),
    EMAIL_CODE_INVALID(1102, 400, "result.email.code_invalid", "邮箱验证码无效或已过期"),
    EMAIL_SEND_TOO_FREQUENT(1103, 429, "result.email.send_too_frequent", "发送过于频繁，请稍后再试"),
    EMAIL_SEND_FAILED(1104, 500, "result.email.send_failed", "邮件发送失败，请稍后再试"),
    EMAIL_ALREADY_VERIFIED(1105, 400, "result.email.already_verified", "邮箱已验证"),
    EMAIL_VERIFY_LINK_INVALID(1106, 400, "result.email.verify_link_invalid", "验证链接无效或已过期"),

    // internal 1201-1299
    INTERNAL_KEY_INVALID(1201, 401, "result.internal.key_invalid", "invalid internal key"),
    INTERNAL_KEY_NOT_CONFIGURED(1202, 503, "result.internal.key_not_configured", "internal key not configured"),
    INTERNAL_FORBIDDEN(1203, 403, "result.internal.forbidden", "forbidden"),

    // content 2001-2099
    CONTENT_NOT_FOUND(2001, 404, "result.content.not_found", "内容不存在"),
    NOVEL_NOT_FOUND(2002, 404, "result.content.novel_not_found", "小说不存在"),
    CHAPTER_NOT_FOUND(2003, 404, "result.content.chapter_not_found", "章节不存在"),
    SESSION_NOT_FOUND(2004, 404, "result.content.session_not_found", "会话不存在"),
    VOLUME_NOT_FOUND(2005, 404, "result.content.volume_not_found", "卷不存在"),
    CHAPTER_VERSION_NOT_FOUND(2006, 404, "result.content.chapter_version_not_found", "版本不存在"),
    AGENT_RUN_NOT_FOUND(2010, 404, "result.content.agent_run_not_found", "运行记录不存在"),
    AGENT_RUN_FORBIDDEN(2011, 403, "result.content.agent_run_forbidden", "无权访问该运行记录"),
    AGENT_RUN_TRANSITION_INVALID(2012, 400, "result.content.agent_run_transition_invalid", "非法 Run 状态迁移"),
    STORY_MEMORY_FAILED(2020, 400, "result.content.story_memory_failed", "记忆操作失败"),
    CONTENT_SCOPE_INVALID(2021, 400, "result.content.scope_invalid", "不支持的 scope"),
    CONTENT_INVALID_OWNER(2022, 400, "result.content.invalid_owner", "用户或资源标识无效"),
    IMAGE_GENERATION_FAILED(2030, 503, "result.content.image_generation_failed", "图像生成失败"),

    // crm 3001-3099
    CRM_USER_NOT_FOUND(3001, 404, "result.crm.user_not_found", "用户不存在"),

    // billing 2101-2199
    BILLING_PLAN_NOT_FOUND(2101, 404, "result.billing.plan_not_found", "套餐不存在"),
    BILLING_QUOTA_EXCEEDED(2102, 402, "result.billing.quota_exceeded", "本月配额已用尽"),
    BILLING_SUBSCRIPTION_NOT_FOUND(2103, 404, "result.billing.subscription_not_found", "订阅不存在"),
    BILLING_FEATURE_NOT_AVAILABLE(2104, 403, "result.billing.feature_not_available", "当前套餐不支持此功能");

    private final int code;
    private final int httpStatus;
    private final String messageKey;
    private final String defaultMessage;

    ResultCode(int code, int httpStatus, String messageKey, String defaultMessage) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.messageKey = messageKey;
        this.defaultMessage = defaultMessage;
    }

    public int getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getMessageKey() {
        return messageKey;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }

    public static Optional<ResultCode> fromCode(int code) {
        return Arrays.stream(values()).filter(item -> item.code == code).findFirst();
    }
}
