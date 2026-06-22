package cn.novelstudio.module.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CaptchaPublicConfigResponse {
    /** 是否启用人机验证（需服务端同时配置 site key + secret）。 */
    private boolean turnstileEnabled;
    /** 公网 site key，仅 enabled=true 时返回。 */
    private String turnstileSiteKey;
}
