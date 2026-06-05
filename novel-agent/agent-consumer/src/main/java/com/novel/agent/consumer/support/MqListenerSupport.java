package com.novel.agent.consumer.support;

import org.slf4j.Logger;

/**
 * MQ 监听通用包装：统一异常日志，避免监听器内重复 try/catch。
 */
public final class MqListenerSupport {

    @FunctionalInterface
    public interface MessageHandler {
        void handle(String message) throws Exception;
    }

    private MqListenerSupport() {}

    public static void safeHandle(Logger log, String message, String errorLabel, MessageHandler handler) {
        try {
            handler.handle(message);
        } catch (Exception ex) {
            log.error("{}: {}", errorLabel, message, ex);
        }
    }
}
