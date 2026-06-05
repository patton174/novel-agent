package com.novel.agent.auth.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class AuthExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getDefaultMessage() == null ? "参数无效" : err.getDefaultMessage())
            .orElse("参数无效");
        return body(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        String message = ex.getMessage() == null ? "请求失败" : ex.getMessage();
        HttpStatus status = classify(message);
        return body(status, message);
    }

    private static HttpStatus classify(String message) {
        if (message.contains("用户名或密码错误")
            || message.contains("登录已过期")
            || message.contains("未登录")) {
            return HttpStatus.UNAUTHORIZED;
        }
        if (message.contains("已存在")
            || message.contains("已被注册")
            || message.contains("不能为空")
            || message.contains("不支持")) {
            return HttpStatus.BAD_REQUEST;
        }
        if (message.contains("已被禁用")) {
            return HttpStatus.FORBIDDEN;
        }
        if (message.contains("过于频繁")
            || message.contains("发送过于频繁")
            || message.contains("次数已达上限")) {
            return HttpStatus.TOO_MANY_REQUESTS;
        }
        if (message.contains("验证码")
            || message.contains("滑块")
            || message.contains("验证邮箱")) {
            return HttpStatus.BAD_REQUEST;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("code", status.value());
        payload.put("message", message);
        return ResponseEntity.status(status).body(payload);
    }
}
