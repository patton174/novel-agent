package cn.novelstudio.platform.storage;

import java.io.InputStream;

/**
 * 文件存储抽象：上传文件落盘/读取/删除/存在性检查。
 * 当前实现 {@link LocalDiskStorageBackend}；后续可加 OSS/S3 实现。
 */
public interface StorageBackend {

    void save(InputStream in, String key);

    InputStream load(String key);

    void delete(String key);

    boolean exists(String key);
}
