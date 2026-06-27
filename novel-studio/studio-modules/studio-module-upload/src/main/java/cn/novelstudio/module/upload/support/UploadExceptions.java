package cn.novelstudio.module.upload.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.ValidationException;

/**
 * upload 模块统一业务异常工厂。
 */
public final class UploadExceptions {

    private UploadExceptions() {}

    public static ValidationException missingExtension() {
        return ValidationException.keyed("upload.missing_extension");
    }

    public static ValidationException formatUnsupported(String ext) {
        return ValidationException.keyed("upload.format_unsupported", ext);
    }

    public static ValidationException fileNotFound() {
        return ValidationException.keyed("upload.file_not_found");
    }

    public static ValidationException fileForbidden() {
        return ValidationException.keyed("upload.file_forbidden");
    }

    public static BizException readFailed(Throwable cause) {
        String detail = cause == null || cause.getMessage() == null || cause.getMessage().isBlank()
            ? "unknown"
            : cause.getMessage();
        return BizException.keyed(ResultCode.ERROR, "upload.read_failed", detail);
    }

    public static ValidationException fileRequired() {
        return ValidationException.keyed(ResultCode.BAD_REQUEST, "upload.file_required");
    }
}
