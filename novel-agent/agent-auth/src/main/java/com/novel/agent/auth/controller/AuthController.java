package com.novel.agent.auth.controller;

import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.LoginResponse;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        log.info("登录请求: username={}", request.getUsername());
        return authService.login(request);
    }

    @PostMapping("/register")
    public void register(@Valid @RequestBody RegisterRequest request) {
        log.info("注册请求: username={}", request.getUsername());
        authService.register(request);
    }

    @PostMapping("/logout")
    public void logout() {
        authService.logout();
    }

    @GetMapping("/info")
    public LoginResponse getCurrentUser() {
        Long userId = authService.getCurrentUserId();
        return LoginResponse.builder()
                .userId(userId)
                .username(String.valueOf(userId))
                .build();
    }
}