package com.novel.agent.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CaptchaTokenResponse {
    private String captchaToken;
}
