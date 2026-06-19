package com.novel.agent.common.image.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "agent.image")
public class ImageClientProperties {

    /** HTTP 请求超时（秒），生图通常需数秒至数十秒 */
    private int timeoutSeconds = 120;

    /** 滑块验证码是否尝试 AI 背景（失败时回退 Java2D） */
    private boolean captchaEnabled = true;

    /** 滑块验证码 AI 背景生图尺寸 */
    private String captchaSize = "1024x768";

    /** 书籍封面默认生图尺寸（竖版） */
    private String coverSize = "768x1024";
}
