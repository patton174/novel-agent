package cn.novelstudio.module.content.storage;

import java.io.InputStream;

/**
 * 文件存储抽象：上传文件落盘/读取/删除/存在性检查。
 * 当前实现 {@link LocalDiskStorageBackend}；后续可加 OSS/S3 实现。
 */
public interface StorageBackend {

    /** 将输入流写入指定 key（key 形如 {@code 2026/06/19/<uuid>.epub}）。 */
    void save(InputStream in, String key);

    /** 读取指定 key 的输入流。 */
    InputStream load(String key);

    /** 删除指定 key（不存在则静默）。 */
    void delete(String key);

    /** 判断指定 key 是否存在。 */
    boolean exists(String key);
}
