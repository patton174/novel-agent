package com.novel.agent.auth.dao;

import com.novel.agent.auth.entity.AuthUser;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.util.Optional;

public interface UserInfoDao {

    Page<AuthUser> pageByKeyword(String keyword, int page, int size);

    Optional<AuthUser> findById(Long id);

    void updateRoleAndStatus(Long id, String role, Boolean isActive);

    long countAll();

    long countCreatedSince(Instant since);

    long countActiveUsers();
}
