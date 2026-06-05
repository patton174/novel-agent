package com.novel.agent.content.support;

import com.novel.agent.content.agent.AgentRunStatus;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.common.core.exception.ValidationException;

/**
 * content 模块统一业务异常工厂，Service 层禁止直接抛 ResponseStatusException。
 */
public final class ContentExceptions {

    private ContentExceptions() {}

    public static NotFoundException novelNotFound() {
        return new NotFoundException(ResultCode.NOVEL_NOT_FOUND, "小说不存在");
    }

    public static NotFoundException chapterNotFound() {
        return new NotFoundException(ResultCode.CHAPTER_NOT_FOUND, "章节不存在");
    }

    public static NotFoundException volumeNotFound() {
        return new NotFoundException(ResultCode.VOLUME_NOT_FOUND, "卷不存在");
    }

    public static NotFoundException versionNotFound() {
        return new NotFoundException(ResultCode.CHAPTER_VERSION_NOT_FOUND, "版本不存在");
    }

    public static NotFoundException agentRunNotFound() {
        return new NotFoundException(ResultCode.AGENT_RUN_NOT_FOUND, "运行记录不存在");
    }

    public static ValidationException commandIdRequired() {
        return new ValidationException(ResultCode.BAD_REQUEST, "commandId required");
    }

    public static ValidationException agentRunTransitionInvalid(AgentRunStatus from, AgentRunStatus to) {
        return new ValidationException(
            ResultCode.AGENT_RUN_TRANSITION_INVALID,
            "非法 Run 状态迁移: " + from + " -> " + to
        );
    }

    public static ValidationException badRequest(String message) {
        return new ValidationException(message);
    }

    public static ValidationException badRequest(ResultCode code, String message) {
        return new ValidationException(code, message);
    }
}
