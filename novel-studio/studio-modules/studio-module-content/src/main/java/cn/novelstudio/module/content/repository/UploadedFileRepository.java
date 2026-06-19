package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UploadedFileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UploadedFileRepository extends JpaRepository<UploadedFileEntity, String> {

    /** 配额计数：用户活跃（pending/parsing/ready）上传数，failed 不占额度。 */
    @Query("""
        SELECT COUNT(e) FROM UploadedFileEntity e
        WHERE e.ownerId = :ownerId AND e.ownerType = 'user'
          AND e.status IN ('pending','parsing','ready')
        """)
    long countActiveByOwner(Long ownerId);

    Page<UploadedFileEntity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);
}
