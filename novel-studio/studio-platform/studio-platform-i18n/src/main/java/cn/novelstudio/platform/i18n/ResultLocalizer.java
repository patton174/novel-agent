package cn.novelstudio.platform.i18n;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.enums.ResultCode;
import org.springframework.stereotype.Component;

@Component
public class ResultLocalizer {

    private final StudioMessages messages;
    private final I18nProperties properties;

    public ResultLocalizer(StudioMessages messages, I18nProperties properties) {
        this.messages = messages;
        this.properties = properties;
    }

    public String resolve(ResultCode code, Object... args) {
        return messages.getOrDefault(code.getMessageKey(), code.getDefaultMessage(), args);
    }

    public String resolveFramework(String key, String fallback, Object... args) {
        return messages.getOrDefault(key, fallback, args);
    }

    /** 若 message 是 MessageSource key 则翻译，否则原样返回（含中文 legacy 文案）。 */
    public String resolveLiteral(String message, Object... args) {
        if (message == null || message.isBlank()) {
            return message;
        }
        if (!looksLikeMessageKey(message)) {
            return message;
        }
        return messages.getOrDefault(message, message, args);
    }

    /** Bean Validation {@code {key}} 或裸 key → 当前 Locale 文案。 */
    public String resolveValidationFieldMessage(String defaultMessage) {
        if (defaultMessage == null || defaultMessage.isBlank()) {
            return resolve(ResultCode.BAD_REQUEST);
        }
        String key = defaultMessage.trim();
        if (key.startsWith("{") && key.endsWith("}")) {
            key = key.substring(1, key.length() - 1).trim();
        }
        return resolveLiteral(key);
    }

    private static boolean looksLikeMessageKey(String message) {
        return message.matches("^[a-z][a-z0-9_.]*$");
    }

    public String resolveException(BizException ex) {
        if (ex.hasMessageKey()) {
            ResultCode code = ResultCode.fromCode(ex.getCode()).orElse(ResultCode.ERROR);
            return messages.getOrDefault(ex.getMessageKey(), code.getDefaultMessage(), ex.getMessageArgs());
        }
        ResultCode code = ResultCode.fromCode(ex.getCode()).orElse(null);
        if (code == null) {
            return ex.getMessage();
        }
        return resolveIfDefault(code, ex.getMessage());
    }

    public <T> Result<T> localize(Result<T> result) {
        if (!properties.isEnabled() || result == null) {
            return result;
        }
        ResultCode code = ResultCode.fromCode(result.code()).orElse(null);
        if (code == null) {
            return result;
        }
        String localized = resolveIfDefault(code, result.msg());
        if (result.success()) {
            return new Result<>(result.code(), localized, result.data(), true);
        }
        return Result.fail(result.code(), localized);
    }

    private String resolveIfDefault(ResultCode code, String currentMsg) {
        String localized = resolve(code);
        if (currentMsg == null || currentMsg.isBlank() || currentMsg.equals(code.getDefaultMessage())) {
            return localized;
        }
        return currentMsg;
    }
}
