package cn.novelstudio.module.content.support;

import cn.novelstudio.module.content.agent.AgentRunStatus;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;

/**
 * content 模块统一业务异常工厂，Service 层禁止直接抛 ResponseStatusException。
 */
public final class ContentExceptions {

    private ContentExceptions() {}

    public static NotFoundException novelNotFound() {
        return keyedNotFound(ResultCode.NOVEL_NOT_FOUND);
    }

    public static NotFoundException chapterNotFound() {
        return keyedNotFound(ResultCode.CHAPTER_NOT_FOUND);
    }

    public static NotFoundException volumeNotFound() {
        return keyedNotFound(ResultCode.VOLUME_NOT_FOUND);
    }

    public static NotFoundException versionNotFound() {
        return keyedNotFound(ResultCode.CHAPTER_VERSION_NOT_FOUND);
    }

    public static NotFoundException agentRunNotFound() {
        return keyedNotFound(ResultCode.AGENT_RUN_NOT_FOUND);
    }

    public static ValidationException commandIdRequired() {
        return ValidationException.keyed("content.chapter.command_id_required");
    }

    public static ValidationException agentRunTransitionInvalid(AgentRunStatus from, AgentRunStatus to) {
        return ValidationException.keyed(
            ResultCode.AGENT_RUN_TRANSITION_INVALID,
            ResultCode.AGENT_RUN_TRANSITION_INVALID.getMessageKey(),
            from,
            to
        );
    }

    public static ValidationException badRequest(String messageKey, Object... args) {
        return ValidationException.keyed(messageKey, args);
    }

    public static ValidationException badRequest(ResultCode code, String messageKey, Object... args) {
        return ValidationException.keyed(code, messageKey, args);
    }

    public static ValidationException memory(String messageKey, Object... args) {
        return ValidationException.keyed(messageKey, args);
    }

    public static NotFoundException memoryNotFound(Object memoryId) {
        return NotFoundException.keyed("memory.not_found", memoryId);
    }

    private static NotFoundException keyedNotFound(ResultCode code) {
        return NotFoundException.keyed(code, code.getMessageKey());
    }
}
