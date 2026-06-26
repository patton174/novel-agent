package cn.novelstudio.platform.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/** 本地磁盘存储实现：按 storageDir 根目录 + dated key 落盘，含路径穿越防护。 */
@Component
public class LocalDiskStorageBackend implements StorageBackend {

    private final UploadStorageProperties props;
    private Path root;

    public LocalDiskStorageBackend(UploadStorageProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() throws Exception {
        ensureRoot();
    }

    private void ensureRoot() throws Exception {
        if (root == null) {
            root = Paths.get(props.getStorageDir()).toAbsolutePath().normalize();
            Files.createDirectories(root);
        }
    }

    private Path resolve(String key) {
        try {
            ensureRoot();
        } catch (Exception e) {
            throw new IllegalStateException("storage.root_init_failed", e);
        }
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("storage.invalid_path");
        }
        return resolved;
    }

    @Override
    public void save(InputStream in, String key) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new IllegalStateException("storage.save_failed", e);
        }
    }

    @Override
    public InputStream load(String key) {
        Path target = resolve(key);
        try {
            return Files.newInputStream(target);
        } catch (Exception e) {
            throw new IllegalStateException("storage.read_failed", e);
        }
    }

    @Override
    public void delete(String key) {
        Path target = resolve(key);
        try {
            Files.deleteIfExists(target);
        } catch (Exception ignored) {
            // 删除失败不阻断主流程
        }
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(resolve(key));
    }
}
