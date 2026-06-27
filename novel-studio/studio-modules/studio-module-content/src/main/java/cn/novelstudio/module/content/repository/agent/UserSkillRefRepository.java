package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.UserSkillRefEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSkillRefRepository extends JpaRepository<UserSkillRefEntity, UUID> {

    Optional<UserSkillRefEntity> findByUserIdAndSkillId(Long userId, UUID skillId);

    List<UserSkillRefEntity> findByUserIdAndSkillIdIn(Long userId, Collection<UUID> skillIds);

    List<UserSkillRefEntity> findByUserId(Long userId);
}
