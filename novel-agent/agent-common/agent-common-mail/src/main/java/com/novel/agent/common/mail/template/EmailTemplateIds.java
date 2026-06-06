package com.novel.agent.common.mail.template;

/**
 * 内置 MJML 编译模板 ID（classpath:mail/{id}.html|txt）。
 */
public final class EmailTemplateIds {

    public static final String VERIFY_LINK = "verify-link";
    public static final String VERIFY_CODE = "verify-code";

    private EmailTemplateIds() {
    }
}
