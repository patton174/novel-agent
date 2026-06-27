package cn.novelstudio.module.worker.repository;

import cn.novelstudio.module.worker.entity.ScheduledJobRunEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduledJobRunRepository extends JpaRepository<ScheduledJobRunEntity, Long> {

    List<ScheduledJobRunEntity> findByJobIdOrderByStartedAtDesc(String jobId, Pageable pageable);
}
