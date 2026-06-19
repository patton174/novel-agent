package com.novel.agent.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SliderCaptchaChallengeResponse {
    private String captchaId;
    private String backgroundImage;
    private String puzzleImage;
    private int puzzleY;
    private int sliderWidth;
}
