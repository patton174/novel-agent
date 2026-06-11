package cn.novelstudio.kernel.base;

import cn.novelstudio.kernel.enums.ResultCode;

/**
 * 统一 API 响应封装（对齐 KPI：code/msg/data/success）。
 */
public record Result<T>(int code, String msg, T data, boolean success) {

    public static final int SUCCESS_CODE = 200;

    public static <T> Result<T> ok(T data) {
        return new Result<>(SUCCESS_CODE, ResultCode.SUCCESS.getDefaultMessage(), data, true);
    }

    public static <T> Result<T> ok() {
        return ok(null);
    }

    public static <T> Result<T> fail(int code, String msg) {
        return new Result<>(code, msg, null, false);
    }

    public static <T> Result<T> fail(ResultCode resultCode) {
        return fail(resultCode.getCode(), resultCode.getDefaultMessage());
    }

    public static <T> Result<T> fail(ResultCode resultCode, String msg) {
        return fail(resultCode.getCode(), msg);
    }

    /** 业务层可直接返回错误，无需抛异常 */
    public static <T> Result<T> error(String msg) {
        return fail(ResultCode.ERROR.getCode(), msg);
    }

    public boolean isSuccess() {
        return success;
    }
}
