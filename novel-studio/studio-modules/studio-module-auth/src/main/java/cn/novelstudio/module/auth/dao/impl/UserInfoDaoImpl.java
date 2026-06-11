package cn.novelstudio.module.auth.dao.impl;

import cn.novelstudio.module.auth.dao.UserInfoDao;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserInfoDaoImpl implements UserInfoDao {

    private final AuthUserRepository authUserRepository;

    @Override
    public Page<AuthUser> pageByKeyword(String keyword, int page, int size) {
        Specification<AuthUser> spec = (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return cb.conjunction();
            }
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            return cb.like(cb.lower(root.get("username")), pattern);
        };
        int pageIndex = Math.max(page - 1, 0);
        int pageSize = Math.max(size, 1);
        Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        return authUserRepository.findAll(spec, pageable);
    }

    @Override
    public Optional<AuthUser> findById(Long id) {
        return authUserRepository.findById(id);
    }

    @Override
    public void updateRoleAndStatus(Long id, String role, Boolean isActive) {
        AuthUser user = authUserRepository.findById(id)
            .orElseThrow(() -> new NotFoundException(ResultCode.CRM_USER_NOT_FOUND, "用户不存在"));
        user.setRole(role);
        user.setIsActive(isActive);
        authUserRepository.save(user);
    }

    @Override
    public long countAll() {
        return authUserRepository.count();
    }

    @Override
    public long countCreatedSince(Instant since) {
        if (since == null) {
            return 0L;
        }
        return authUserRepository.countByCreatedAtGreaterThanEqual(since);
    }

    @Override
    public long countActiveUsers() {
        // Phase 1: active account count; 7-day heartbeat scan deferred to later phase.
        return authUserRepository.countByIsActiveTrue();
    }
}
