package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class UnauthorizedException extends BizException {

    public UnauthorizedException(String message) {
        super(ResultCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
