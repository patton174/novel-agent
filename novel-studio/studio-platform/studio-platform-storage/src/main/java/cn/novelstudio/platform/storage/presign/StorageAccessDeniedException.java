package cn.novelstudio.platform.storage.presign;

public class StorageAccessDeniedException extends RuntimeException {

    public StorageAccessDeniedException(String message) {
        super(message);
    }
}
