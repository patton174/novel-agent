package cn.novelstudio.platform.storage.presign;

import cn.novelstudio.platform.storage.StorageBackend;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class StoragePresignService {

    public static final String MEDIA_OBJECT_PATH = "/api/content/media/object";

    private final StorageBackend storage;
    private final StorageAccessSigner signer;
    private final List<StorageAccessPolicy> policies;

    public StoragePresignService(
        StorageBackend storage,
        StorageAccessSigner signer,
        List<StorageAccessPolicy> policies
    ) {
        this.storage = storage;
        this.signer = signer;
        this.policies = policies == null ? List.of() : policies;
    }

    public StoragePresignResult presign(long userId, String storageKey) {
        String key = normalizeKey(storageKey);
        assertReadable(userId, key);
        long exp = signer.defaultExpiresAtEpochSec();
        String sig = signer.sign(key, userId, exp);
        String encodedKey = URLEncoder.encode(key, StandardCharsets.UTF_8);
        String url = MEDIA_OBJECT_PATH
            + "?key=" + encodedKey
            + "&uid=" + userId
            + "&exp=" + exp
            + "&sig=" + sig;
        return new StoragePresignResult(url, exp * 1000L);
    }

    public InputStream openSignedObject(String storageKey, long userId, long exp, String sig) {
        String key = normalizeKey(storageKey);
        if (!signer.verify(key, userId, exp, sig)) {
            throw new StorageAccessDeniedException("storage.access.denied");
        }
        if (!storage.exists(key)) {
            throw new StorageAccessDeniedException("storage.object.not_found");
        }
        return storage.load(key);
    }

    private void assertReadable(long userId, String key) {
        if (key.isBlank()) {
            throw new StorageAccessDeniedException("storage.key.required");
        }
        boolean allowed = policies.stream().anyMatch(policy -> policy.canRead(userId, key));
        if (!allowed) {
            throw new StorageAccessDeniedException("storage.access.denied");
        }
    }

    private static String normalizeKey(String storageKey) {
        if (storageKey == null) {
            return "";
        }
        return storageKey.trim().replace('\\', '/');
    }
}
