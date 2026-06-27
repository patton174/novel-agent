package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(
    excludeAutoConfiguration = FlywayAutoConfiguration.class,
    properties = "spring.jpa.hibernate.ddl-auto=create-drop"
)
@Import(UserBalanceRepositoryTest.JpaTestConfig.class)
class UserBalanceRepositoryTest {

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = FlywayAutoConfiguration.class)
    @EntityScan(basePackageClasses = UserBalanceEntity.class)
    @EnableJpaRepositories(basePackageClasses = UserBalanceRepository.class)
    static class JpaTestConfig {
    }

    @Autowired
    UserBalanceRepository repo;

    @Autowired
    TestEntityManager entityManager;

    @Test
    void findByUserId_returnsBalance() {
        UserBalanceEntity b = new UserBalanceEntity();
        b.setUserId(10L);
        b.setBalanceMicros(5000L);
        repo.save(b);
        Optional<UserBalanceEntity> found = repo.findById(10L);
        assertThat(found).isPresent();
        assertThat(found.get().getBalanceMicros()).isEqualTo(5000L);
    }

    @Test
    void atomicDeduct_decrementsBalance() {
        UserBalanceEntity b = new UserBalanceEntity();
        b.setUserId(11L);
        b.setBalanceMicros(1000L);
        repo.save(b);
        int affected = repo.deduct(11L, 300L);
        assertThat(affected).isEqualTo(1);
        entityManager.clear();
        assertThat(repo.findById(11L).get().getBalanceMicros()).isEqualTo(700L);
    }
}
