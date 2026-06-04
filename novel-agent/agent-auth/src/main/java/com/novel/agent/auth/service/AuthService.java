package com.novel.agent.auth.service;

import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.LoginResponse;
import com.novel.agent.auth.dto.RegisterRequest;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    void register(RegisterRequest request);

    void logout();

    Long getCurrentUserId();
}