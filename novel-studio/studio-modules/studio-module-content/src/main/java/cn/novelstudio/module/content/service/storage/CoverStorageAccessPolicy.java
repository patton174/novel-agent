package cn.novelstudio.module.content.service.storage;

import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.platform.storage.presign.StorageAccessPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CoverStorageAccessPolicy implements StorageAccessPolicy {

    private final NovelRepository novelRepository;

    @Override
    public boolean canRead(long userId, String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return false;
        }
        String prefix = "covers/" + userId + "/";
        if (!storageKey.startsWith(prefix)) {
            return false;
        }
        return novelRepository.existsByUserIdAndCoverStorageKey(userId, storageKey);
    }
}
