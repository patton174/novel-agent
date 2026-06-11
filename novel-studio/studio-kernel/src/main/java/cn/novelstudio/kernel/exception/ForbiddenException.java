package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class ForbiddenException extends BizException {

    public ForbiddenException(String message) {
        super(ResultCode.FORBIDDEN, message);
    }

    public ForbiddenException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
