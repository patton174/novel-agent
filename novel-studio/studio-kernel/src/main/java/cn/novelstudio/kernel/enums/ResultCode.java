package cn.novelstudio.kernel.enums;

/**
 * 统一错误码：{@code code} 写入 Result 响应体；{@code httpStatus} 映射 HTTP 状态。
 * 通用段与 HTTP 对齐；业务段按模块划分（auth 10xx / captcha 11xx / content 20xx / crm 30xx）。
 */
public enum ResultCode {

    SUCCESS(200, 200, "success"),
    BAD_REQUEST(400, 400, "参数无效"),
    UNAUTHORIZED(401, 401, "未登录或登录已过期"),
    FORBIDDEN(403, 403, "无权访问"),
    NOT_FOUND(404, 404, "资源不存在"),
    TOO_MANY_REQUESTS(429, 429, "请求过于频繁"),
    ERROR(500, 500, "系统错误"),

    // auth 1001-1099
    AUTH_USER_NOT_FOUND(1001, 404, "用户不存在"),
    AUTH_LOGIN_FAILED(1002, 401, "用户名或密码错误"),
    AUTH_USER_DISABLED(1003, 403, "账号已被禁用"),
    AUTH_EMAIL_NOT_VERIFIED(1004, 400, "请先验证邮箱后再登录"),
    AUTH_USERNAME_EXISTS(1005, 400, "用户名已存在"),
    AUTH_EMAIL_EXISTS(1006, 400, "邮箱已被注册"),
    AUTH_TOKEN_EXPIRED(1007, 401, "登录已过期，请重新登录"),
    AUTH_ROLE_INVALID(1008, 400, "不支持的角色"),
    AUTH_REGISTRATION_DISABLED(1009, 503, "注册功能暂时关闭，请稍后再试"),

    // captcha / 邮箱 1101-1199
    CAPTCHA_INVALID(1101, 400, "验证码无效或已过期"),
    EMAIL_CODE_INVALID(1102, 400, "邮箱验证码无效或已过期"),
    EMAIL_SEND_TOO_FREQUENT(1103, 429, "发送过于频繁，请稍后再试"),
    EMAIL_SEND_FAILED(1104, 500, "邮件发送失败，请稍后再试"),
    EMAIL_ALREADY_VERIFIED(1105, 400, "邮箱已验证"),
    EMAIL_VERIFY_LINK_INVALID(1106, 400, "验证链接无效或已过期"),

    // internal 1201-1299
    INTERNAL_KEY_INVALID(1201, 401, "invalid internal key"),
    INTERNAL_KEY_NOT_CONFIGURED(1202, 503, "internal key not configured"),
    INTERNAL_FORBIDDEN(1203, 403, "forbidden"),

    // content 2001-2099
    CONTENT_NOT_FOUND(2001, 404, "内容不存在"),
    NOVEL_NOT_FOUND(2002, 404, "小说不存在"),
    CHAPTER_NOT_FOUND(2003, 404, "章节不存在"),
    SESSION_NOT_FOUND(2004, 404, "会话不存在"),
    VOLUME_NOT_FOUND(2005, 404, "卷不存在"),
    CHAPTER_VERSION_NOT_FOUND(2006, 404, "版本不存在"),
    AGENT_RUN_NOT_FOUND(2010, 404, "运行记录不存在"),
    AGENT_RUN_FORBIDDEN(2011, 403, "无权访问该运行记录"),
    AGENT_RUN_TRANSITION_INVALID(2012, 400, "非法 Run 状态迁移"),
    STORY_MEMORY_FAILED(2020, 400, "记忆操作失败"),
    CONTENT_SCOPE_INVALID(2021, 400, "不支持的 scope"),
    CONTENT_INVALID_OWNER(2022, 400, "用户或资源标识无效"),
    IMAGE_GENERATION_FAILED(2030, 503, "图像生成失败"),

    // crm 3001-3099
    CRM_USER_NOT_FOUND(3001, 404, "用户不存在"),

    // billing 2101-2199
    BILLING_PLAN_NOT_FOUND(2101, 404, "套餐不存在"),
    BILLING_QUOTA_EXCEEDED(2102, 402, "本月配额已用尽"),
    BILLING_SUBSCRIPTION_NOT_FOUND(2103, 404, "订阅不存在"),
    BILLING_FEATURE_NOT_AVAILABLE(2104, 403, "当前套餐不支持此功能");

    private final int code;
    private final int httpStatus;
    private final String defaultMessage;

    ResultCode(int code, int httpStatus, String defaultMessage) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public int getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
