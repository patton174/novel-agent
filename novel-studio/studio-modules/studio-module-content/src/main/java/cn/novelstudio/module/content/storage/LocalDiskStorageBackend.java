package cn.novelstudio.module.content.storage;

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

    /** 懒初始化 root（支持非 Spring 单元测试直接 new）。 */
    private void ensureRoot() throws Exception {
        if (root == null) {
            root = Paths.get(props.getStorageDir()).toAbsolutePath().normalize();
            Files.createDirectories(root);
        }
    }

    /** 解析 key 为根目录下的绝对路径；拒绝 {@code ..} 路径穿越。 */
    private Path resolve(String key) {
        try {
            ensureRoot();
        } catch (Exception e) {
            throw new RuntimeException("存储根目录初始化失败: " + props.getStorageDir(), e);
        }
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("非法存储路径: " + key);
        }
        return resolved;
    }

    @Override
    public void save(InputStream in, String key) {
        // resolve 在 try 外，使 IllegalArgumentException（路径穿越）原样抛出
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new RuntimeException("文件落盘失败: " + key, e);
        }
    }

    @Override
    public InputStream load(String key) {
        Path target = resolve(key);
        try {
            return Files.newInputStream(target);
        } catch (Exception e) {
            throw new RuntimeException("文件读取失败: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        Path target = resolve(key);
        try {
            Files.deleteIfExists(target);
        } catch (Exception e) {
            // 删除失败不阻断主流程，仅记日志（此处无 logger 依赖，吞掉）
        }
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(resolve(key));
    }
}
