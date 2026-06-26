package cn.novelstudio.module.upload.repository;

import cn.novelstudio.module.upload.entity.UploadedFileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface UploadedFileRepository extends JpaRepository<UploadedFileEntity, String> {

    @Query("""
        SELECT COUNT(e) FROM UploadedFileEntity e
        WHERE e.ownerId = :ownerId AND e.ownerType = 'user'
          AND e.status IN ('pending','parsing','ready')
        """)
    long countActiveByOwner(Long ownerId);

    Page<UploadedFileEntity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);

    Page<UploadedFileEntity> findByStatusInOrderByUpdatedAtDesc(List<String> statuses, Pageable pageable);

    List<UploadedFileEntity> findByStatusInAndUpdatedAtBefore(List<String> statuses, Instant before);
}
