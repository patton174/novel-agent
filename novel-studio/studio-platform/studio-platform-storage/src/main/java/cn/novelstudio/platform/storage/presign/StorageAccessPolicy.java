package cn.novelstudio.platform.storage.presign;

/**
 * 校验当前用户是否可读指定 storage key；各业务模块注册实现（封面、上传等）。
 */
public interface StorageAccessPolicy {

    boolean canRead(long userId, String storageKey);
}
