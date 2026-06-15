package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.UserWritingActivityDailyEntity;
import cn.novelstudio.module.content.repository.UserWritingActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class UserWritingActivityService {

    private final UserWritingActivityRepository repository;

    @Transactional
    public void recordWordsAdded(Long userId, long delta) {
        if (userId == null || delta <= 0) {
            return;
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        UserWritingActivityDailyEntity entity = repository
            .findByUserIdAndActivityDate(userId, today)
            .orElseGet(() -> {
                UserWritingActivityDailyEntity created = new UserWritingActivityDailyEntity();
                created.setUserId(userId);
                created.setActivityDate(today);
                created.setWordsAdded(0L);
                return created;
            });
        entity.setWordsAdded(entity.getWordsAdded() + delta);
        entity.setUpdatedAt(Instant.now());
        repository.save(entity);
    }
}
