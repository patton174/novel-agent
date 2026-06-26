package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

/**
 * 业务异常基类：由 Biz/Service 显式抛出，禁止用 RuntimeException + 中文文案做分支。
 * <p>
 * 国际化：使用 {@link #keyed(ResultCode, String, Object...)} 传入 MessageSource key。
 */
public class BizException extends RuntimeException {

    private final int code;
    private final int httpStatus;
    private final String messageKey;
    private final Object[] messageArgs;

    public BizException(ResultCode resultCode) {
        this(resultCode, null, null, resultCode.getDefaultMessage());
    }

    /** 固定文案（legacy）；英文 Locale 下不自动翻译。 */
    public BizException(ResultCode resultCode, String message) {
        this(resultCode, null, null, message);
    }

    protected BizException(ResultCode resultCode, String messageKey, Object[] messageArgs, String logMessage) {
        super(logMessage == null ? resultCode.getDefaultMessage() : logMessage);
        this.code = resultCode.getCode();
        this.httpStatus = resultCode.getHttpStatus();
        this.messageKey = messageKey;
        this.messageArgs = messageArgs;
    }

    public static BizException keyed(ResultCode resultCode, String messageKey, Object... messageArgs) {
        return new BizException(resultCode, messageKey, messageArgs, messageKey);
    }

    public static BizException of(ResultCode resultCode) {
        return new BizException(resultCode);
    }

    public static BizException of(ResultCode resultCode, String message) {
        return new BizException(resultCode, message);
    }

    /** 兼容直接传 HTTP 语义码 */
    public BizException(int code, String message) {
        super(message);
        this.code = code;
        this.httpStatus = resolveHttpStatus(code);
        this.messageKey = null;
        this.messageArgs = null;
    }

    public int getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getMessageKey() {
        return messageKey;
    }

    public Object[] getMessageArgs() {
        return messageArgs;
    }

    public boolean hasMessageKey() {
        return messageKey != null;
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
