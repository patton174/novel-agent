package com.novel.agent.auth.service.auth.resp;

public record AuthUserInfoResp(
    Long userId,
    String username,
    String email,
    String role,
    Boolean emailVerified
) {}
