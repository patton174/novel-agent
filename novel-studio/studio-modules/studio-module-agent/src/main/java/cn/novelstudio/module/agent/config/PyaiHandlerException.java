package cn.novelstudio.module.agent.config;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ResponseStatusException;

/**
 * PyAI WebFlux 全局异常 → 统一 {@link Result}。
 */
@RestControllerAdvice
public class PyaiHandlerException {

    private static final Logger log = LoggerFactory.getLogger(PyaiHandlerException.class);

    private final ResultLocalizer resultLocalizer;

    public PyaiHandlerException(ResultLocalizer resultLocalizer) {
        this.resultLocalizer = resultLocalizer;
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Result<Void>> handleNotFound(NotFoundException ex) {
        return toError(ex, false);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Result<Void>> handleUnauthorized(UnauthorizedException ex) {
        return toError(ex, false);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Result<Void>> handleForbidden(ForbiddenException ex) {
        return toError(ex, false);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Result<Void>> handleValidation(ValidationException ex) {
        return toError(ex, false);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<Result<Void>> handleTooManyRequests(TooManyRequestsException ex) {
        return toError(ex, false);
    }

    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result<Void>> handleBiz(BizException ex) {
        return toError(ex, ex.getHttpStatus() >= 500);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Result<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(localizedFail(ResultCode.BAD_REQUEST.getCode(), resultLocalizer.resolveLiteral(ex.getMessage())));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Result<Void>> handleIllegalState(IllegalStateException ex) {
        log.error("IllegalStateException: {}", ex.getMessage(), ex);
        String message = resultLocalizer.resolveLiteral(ex.getMessage());
        if (message == null || message.isBlank()) {
            message = resultLocalizer.resolve(ResultCode.ERROR);
        } else if (message.equals(ex.getMessage()) && ex.getMessage() != null && ex.getMessage().matches("^[a-z][a-z0-9_.]*$")) {
            message = resultLocalizer.resolve(ResultCode.ERROR);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(localizedFail(ResultCode.ERROR.getCode(), message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> resultLocalizer.resolveValidationFieldMessage(err.getDefaultMessage()))
            .orElse(resultLocalizer.resolve(ResultCode.BAD_REQUEST));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(localizedFail(ResultCode.BAD_REQUEST.getCode(), message));
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<Result<Void>> handleWebExchangeBind(WebExchangeBindException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> resultLocalizer.resolveValidationFieldMessage(err.getDefaultMessage()))
            .orElse(resultLocalizer.resolve(ResultCode.BAD_REQUEST));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(localizedFail(ResultCode.BAD_REQUEST.getCode(), message));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Result<Void>> handleStatus(ResponseStatusException ex) {
        int code = ex.getStatusCode().value();
        String message = ex.getReason() == null ? resultLocalizer.resolve(ResultCode.ERROR) : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(localizedFail(code, message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(localizedFail(ResultCode.ERROR.getCode(), resultLocalizer.resolve(ResultCode.ERROR)));
    }

    private ResponseEntity<Result<Void>> toError(BizException ex, boolean warn) {
        if (warn) {
            log.warn("BizException: code={}, http={}, msg={}", ex.getCode(), ex.getHttpStatus(), ex.getMessage());
        }
        return ResponseEntity.status(ex.getHttpStatus())
            .body(localizedFail(ex.getCode(), resultLocalizer.resolveException(ex)));
    }

    private Result<Void> localizedFail(int code, String message) {
        return resultLocalizer.localize(Result.fail(code, message));
    }
}
