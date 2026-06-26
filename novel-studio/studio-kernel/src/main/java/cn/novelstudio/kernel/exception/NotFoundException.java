package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class NotFoundException extends BizException {

    public NotFoundException(String message) {
        super(ResultCode.NOT_FOUND, message);
    }

    public NotFoundException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }

    protected NotFoundException(ResultCode resultCode, String messageKey, Object[] messageArgs) {
        super(resultCode, messageKey, messageArgs, messageKey);
    }

    public static NotFoundException keyed(ResultCode resultCode, String messageKey, Object... messageArgs) {
        return new NotFoundException(resultCode, messageKey, messageArgs);
    }

    public static NotFoundException keyed(String messageKey, Object... messageArgs) {
        return new NotFoundException(ResultCode.NOT_FOUND, messageKey, messageArgs);
    }
}
