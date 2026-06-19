package cn.novelstudio.module.content.storage;

import java.io.InputStream;

/**
 * 文件存储抽象：按 storageKey 读取字节流。
 *
 * <p>Part 1 提供 OSS/本地实现；本接口供 PythonParseClient 等读取上传文件字节。
 * 本 worktree 仅含接口定义以使解析链路编译通过，实现在 Part 1 合并后注入。
 */
public interface StorageBackend {

    /** 按 storageKey 读取文件输入流。调用方负责关闭。 */
    InputStream load(String storageKey);
}
