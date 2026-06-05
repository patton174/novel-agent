package com.novel.agent.auth.controller;

import com.novel.agent.auth.dto.SendEmailCodeRequest;
import com.novel.agent.auth.service.EmailVerificationService;
import com.novel.agent.auth.support.ClientRequestSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;
    private final ClientRequestSupport clientRequestSupport;

    public EmailVerificationController(
        EmailVerificationService emailVerificationService,
        ClientRequestSupport clientRequestSupport
    ) {
        this.emailVerificationService = emailVerificationService;
        this.clientRequestSupport = clientRequestSupport;
    }

    @PostMapping("/send-email-code")
    public void sendEmailCode(@Valid @RequestBody SendEmailCodeRequest request, HttpServletRequest httpRequest) {
        String ip = clientRequestSupport.clientIp(httpRequest);
        String fingerprint = request.getFingerprint() != null && !request.getFingerprint().isBlank()
            ? request.getFingerprint()
            : clientRequestSupport.fingerprint(httpRequest);
        emailVerificationService.sendRegisterCode(request.getEmail(), request.getCaptchaToken(), ip, fingerprint);
    }
}
