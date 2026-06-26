package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class ValidationException extends BizException {

    public ValidationException(String message) {
        super(ResultCode.BAD_REQUEST, message);
    }

    public ValidationException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }

    protected ValidationException(ResultCode resultCode, String messageKey, Object[] messageArgs) {
        super(resultCode, messageKey, messageArgs, messageKey);
    }

    public static ValidationException keyed(ResultCode resultCode, String messageKey, Object... messageArgs) {
        return new ValidationException(resultCode, messageKey, messageArgs);
    }

    public static ValidationException keyed(String messageKey, Object... messageArgs) {
        return new ValidationException(ResultCode.BAD_REQUEST, messageKey, messageArgs);
    }
}
