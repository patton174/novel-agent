package com.novel.agent.common.core.exception;

import com.novel.agent.common.core.enums.ResultCode;

/**
 * 业务异常基类：由 Biz/Service 显式抛出，禁止用 RuntimeException + 中文文案做分支。
 */
public class BizException extends RuntimeException {

    private final int code;
    private final int httpStatus;

    public BizException(ResultCode resultCode) {
        super(resultCode.getDefaultMessage());
        this.code = resultCode.getCode();
        this.httpStatus = resultCode.getHttpStatus();
    }

    public BizException(ResultCode resultCode, String message) {
        super(message);
        this.code = resultCode.getCode();
        this.httpStatus = resultCode.getHttpStatus();
    }

    /** 兼容直接传 HTTP 语义码 */
    public BizException(int code, String message) {
        super(message);
        this.code = code;
        this.httpStatus = resolveHttpStatus(code);
    }

    public static BizException of(ResultCode resultCode) {
        return new BizException(resultCode);
    }

    public static BizException of(ResultCode resultCode, String message) {
        return new BizException(resultCode, message);
    }

    public int getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    private static int resolveHttpStatus(int code) {
        return switch (code) {
            case 400 -> 400;
            case 401 -> 401;
            case 403 -> 403;
            case 404 -> 404;
            case 402 -> 402;
            case 429 -> 429;
            default -> code >= 500 ? 500 : 400;
        };
    }
}
