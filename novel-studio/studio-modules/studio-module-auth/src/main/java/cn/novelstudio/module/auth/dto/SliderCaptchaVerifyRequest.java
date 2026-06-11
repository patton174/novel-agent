package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SliderCaptchaVerifyRequest {

    @NotBlank(message = "captchaId 不能为空")
    private String captchaId;

    @NotNull(message = "offsetX 不能为空")
    private Integer offsetX;
}
