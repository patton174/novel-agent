package cn.novelstudio.module.auth.repository;

import cn.novelstudio.module.auth.entity.AuthUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuthUserRepository extends JpaRepository<AuthUser, Long>, JpaSpecificationExecutor<AuthUser> {

    Optional<AuthUser> findByUsername(String username);

    Optional<AuthUser> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    long countByCreatedAtGreaterThanEqual(Instant since);

    long countByIsActiveTrue();

    @org.springframework.data.jpa.repository.Query(value = """
        SELECT DATE(created_at AT TIME ZONE 'UTC') AS reg_day, COUNT(*) AS reg_count
        FROM auth_user
        WHERE created_at >= :since
        GROUP BY DATE(created_at AT TIME ZONE 'UTC')
        ORDER BY reg_day
        """, nativeQuery = true)
    List<Object[]> countDailyRegistrationsSince(@org.springframework.data.repository.query.Param("since") Instant since);
}