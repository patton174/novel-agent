package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UploadedFileEntity;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 仓库切片测试：需要可用的 JPA 数据源 + {@code @SpringBootConfiguration}
 * （content 为库模块，无 app 入口；开发期连 CN PG 跑）。
 * 本 worktree 无 DB / app 配置，故禁用以保持 {@code mvn test} 绿；
 * 契约由 {@code countActiveByOwner}/{@code findByOwnerIdOrderByCreatedAtDesc} 的 JPQL 表达。
 */
@Disabled("需 live PG + SpringBootConfiguration；无 DB 环境跳过，编译期校验查询契约")
@DataJpaTest
class UploadedFileRepositoryTest {

    @Autowired
    UploadedFileRepository repo;

    private UploadedFileEntity mk(String id, Long owner, String status) {
        UploadedFileEntity e = new UploadedFileEntity();
        e.setId(id);
        e.setOwnerId(owner);
        e.setOwnerType("user");
        e.setOriginalName("a.epub");
        e.setStorageKey("2026/06/19/" + id + ".epub");
        e.setSizeBytes(100L);
        e.setFormat("epub");
        e.setStatus(status);
        return e;
    }

    @Test
    void countActiveByOwner_countsPendingParsingReady_notFailed() {
        repo.save(mk("1", 10L, "pending"));
        repo.save(mk("2", 10L, "ready"));
        repo.save(mk("3", 10L, "failed")); // 不计
        repo.save(mk("4", 20L, "ready"));
        long n = repo.countActiveByOwner(10L);
        assertThat(n).isEqualTo(2);
    }

    @Test
    void findByOwnerIdOrderByCreatedAtDesc_filtersOwner() {
        repo.save(mk("1", 10L, "ready"));
        repo.save(mk("2", 20L, "ready"));
        List<UploadedFileEntity> list = repo.findByOwnerIdOrderByCreatedAtDesc(10L, PageRequest.of(0, 10)).getContent();
        assertThat(list).hasSize(1).extracting(UploadedFileEntity::getId).contains("1");
    }
}
