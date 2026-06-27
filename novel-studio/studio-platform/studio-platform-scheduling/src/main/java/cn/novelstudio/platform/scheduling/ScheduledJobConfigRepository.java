package cn.novelstudio.platform.scheduling;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduledJobConfigRepository extends JpaRepository<ScheduledJobConfigEntity, String> {
}
