package com.novel.agent.auth.controller;

import com.novel.agent.auth.dto.CaptchaTokenResponse;
import com.novel.agent.auth.dto.SendEmailCodeRequest;
import com.novel.agent.auth.dto.SliderCaptchaChallengeResponse;
import com.novel.agent.auth.dto.SliderCaptchaVerifyRequest;
import com.novel.agent.auth.service.RateLimitService;
import com.novel.agent.auth.service.SliderCaptchaService;
import com.novel.agent.auth.support.ClientRequestSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@Slf4j
@RestController
@RequestMapping("/api/auth/captcha")
public class CaptchaController {

    private final SliderCaptchaService sliderCaptchaService;
    private final RateLimitService rateLimitService;
    private final ClientRequestSupport clientRequestSupport;

    public CaptchaController(
        SliderCaptchaService sliderCaptchaService,
        RateLimitService rateLimitService,
        ClientRequestSupport clientRequestSupport
    ) {
        this.sliderCaptchaService = sliderCaptchaService;
        this.rateLimitService = rateLimitService;
        this.clientRequestSupport = clientRequestSupport;
    }

    @PostMapping("/slider")
    public SliderCaptchaChallengeResponse createSliderCaptcha(HttpServletRequest request) {
        String ip = clientRequestSupport.clientIp(request);
        String fingerprint = clientRequestSupport.fingerprint(request);
        rateLimitService.checkComposite("captcha-create", ip, fingerprint, 30, Duration.ofMinutes(10));
        return sliderCaptchaService.createChallenge();
    }

    @PostMapping("/slider/verify")
    public CaptchaTokenResponse verifySliderCaptcha(
        @Valid @RequestBody SliderCaptchaVerifyRequest body,
        HttpServletRequest request
    ) {
        String ip = clientRequestSupport.clientIp(request);
        String fingerprint = clientRequestSupport.fingerprint(request);
        rateLimitService.checkComposite("captcha-verify", ip, fingerprint, 20, Duration.ofMinutes(10));
        String token = sliderCaptchaService.verifyAndIssueToken(body.getCaptchaId(), body.getOffsetX());
        return CaptchaTokenResponse.builder().captchaToken(token).build();
    }
}
