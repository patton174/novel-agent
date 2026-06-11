package cn.novelstudio.module.agent.config;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.kernel.exception.ValidationException;
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
            .body(Result.fail(ResultCode.BAD_REQUEST.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Result<Void>> handleIllegalState(IllegalStateException ex) {
        log.error("IllegalStateException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Result.fail(ResultCode.ERROR));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getDefaultMessage() == null ? ResultCode.BAD_REQUEST.getDefaultMessage() : err.getDefaultMessage())
            .orElse(ResultCode.BAD_REQUEST.getDefaultMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Result.fail(ResultCode.BAD_REQUEST.getCode(), message));
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<Result<Void>> handleWebExchangeBind(WebExchangeBindException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getDefaultMessage() == null ? ResultCode.BAD_REQUEST.getDefaultMessage() : err.getDefaultMessage())
            .orElse(ResultCode.BAD_REQUEST.getDefaultMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Result.fail(ResultCode.BAD_REQUEST.getCode(), message));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Result<Void>> handleStatus(ResponseStatusException ex) {
        int code = ex.getStatusCode().value();
        String message = ex.getReason() == null ? ResultCode.ERROR.getDefaultMessage() : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Result.fail(code, message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Result.fail(ResultCode.ERROR));
    }

    private ResponseEntity<Result<Void>> toError(BizException ex, boolean warn) {
        if (warn) {
            log.warn("BizException: code={}, http={}, msg={}", ex.getCode(), ex.getHttpStatus(), ex.getMessage());
        }
        return ResponseEntity.status(ex.getHttpStatus())
            .body(Result.fail(ex.getCode(), ex.getMessage()));
    }
}
