package com.novel.agent.auth.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.LoginResponse;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.entity.AuthUser;
import com.novel.agent.auth.repository.AuthUserRepository;
import com.novel.agent.auth.service.AuthService;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private IMessageProducer messageProducer;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    @Override
    public LoginResponse login(LoginRequest request) {
        AuthUser user = authUserRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        if (!user.getIsActive()) {
            throw new RuntimeException("账号已被禁用");
        }

        // sa-token 自动存 token 到 Redis
        StpUtil.login(user.getId());
        String token = StpUtil.getTokenValue();

        // 异步发送权限同步消息（不阻塞登录）
        try {
            Long userId = user.getId();
            messageProducer.send(MqTopic.PERMISSION, userId);
        } catch (Exception e) {
            log.warn("异步发送权限消息失败，不影响登录: {}", e.getMessage());
        }

        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .expiresIn(StpUtil.getTokenTimeout())
                .build();
    }

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        if (authUserRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        if (authUserRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("邮箱已被注册");
        }

        AuthUser user = new AuthUser();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole("user");
        user.setPermissions("[\"novel:read\", \"novel:write\"]");

        authUserRepository.save(user);
    }

    @Override
    public void logout() {
        StpUtil.logout();
    }

    @Override
    public Long getCurrentUserId() {
        return StpUtil.getLoginIdAsLong();
    }
}