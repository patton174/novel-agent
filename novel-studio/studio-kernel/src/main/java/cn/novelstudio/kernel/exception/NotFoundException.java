package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class NotFoundException extends BizException {

    public NotFoundException(String message) {
        super(ResultCode.NOT_FOUND, message);
    }

    public NotFoundException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
