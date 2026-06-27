package cn.novelstudio.module.upload.service.storage;

import cn.novelstudio.module.upload.repository.UploadedFileRepository;
import cn.novelstudio.platform.storage.presign.StorageAccessPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UploadStorageAccessPolicy implements StorageAccessPolicy {

    private final UploadedFileRepository fileRepository;

    @Override
    public boolean canRead(long userId, String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return false;
        }
        return fileRepository.existsByStorageKeyAndOwnerId(storageKey, userId);
    }
}
