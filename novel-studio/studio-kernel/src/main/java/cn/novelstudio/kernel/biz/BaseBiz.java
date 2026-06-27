package cn.novelstudio.kernel.biz;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.PageQuery;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.ForbiddenException;
import java.util.Objects;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.kernel.exception.ValidationException;

/**
 * 业务层基类：统一 Result 构造、分页与断言，不依赖 Spring Web。
 */
public abstract class BaseBiz {

    protected <T> Result<T> ok(T data) {
        return Result.ok(data);
    }

    protected Result<Void> ok() {
        return Result.ok();
    }

    protected <T> Result<T> fail(ResultCode code) {
        return Result.fail(code);
    }

    protected <T> Result<T> fail(ResultCode code, String message) {
        return Result.fail(code, message);
    }

    protected <T> Result<T> fail(String message) {
        return Result.fail(ResultCode.ERROR, message);
    }

    protected PageQuery pageQuery(int pageCurrent, int pageSize) {
        return PageQuery.of(pageCurrent, pageSize);
    }

    protected <T> Page<T> pageOf(java.util.List<T> list, long totalCount, PageQuery query) {
        return Page.of(list, totalCount, query.pageCurrent(), query.pageSize());
    }

    protected void require(boolean condition, ResultCode code, String message) {
        if (!condition) {
            if (looksLikeMessageKey(message)) {
                throw BizException.keyed(code, message);
            }
            throw BizException.of(code, message);
        }
    }

    protected void notFoundKeyed(ResultCode code, String messageKey, Object... args) {
        throw NotFoundException.keyed(code, messageKey, args);
    }

    protected void badRequestKeyed(String messageKey, Object... args) {
        throw ValidationException.keyed(messageKey, args);
    }

    protected void badRequestKeyed(ResultCode code, String messageKey, Object... args) {
        throw ValidationException.keyed(code, messageKey, args);
    }

    protected void forbiddenKeyed(ResultCode code, String messageKey, Object... args) {
        throw ForbiddenException.keyed(code, messageKey, args);
    }

    protected void requireOwnerKeyed(Long userId, Long ownerId, ResultCode forbiddenCode, String messageKey, Object... args) {
        if (!Objects.equals(userId, ownerId)) {
            throw ForbiddenException.keyed(forbiddenCode, messageKey, args);
        }
    }

    /**
     * @deprecated 使用 {@link #notFoundKeyed(ResultCode, String, Object...)} 或
     * {@link NotFoundException#keyed(ResultCode, String, Object...)}，以便 i18n 解析 message key。
     */
    @Deprecated(forRemoval = true)
    protected void notFound(String message) {
        throw new NotFoundException(message);
    }

    /**
     * @deprecated 使用 {@link #notFoundKeyed(ResultCode, String, Object...)}。
     */
    @Deprecated(forRemoval = true)
    protected void notFound(ResultCode code, String message) {
        throw new NotFoundException(code, message);
    }

    /**
     * @deprecated 使用 {@link #badRequestKeyed(String, Object...)} 或
     * {@link ValidationException#keyed(String, Object...)}，以便 i18n 解析 message key。
     */
    @Deprecated(forRemoval = true)
    protected void badRequest(String message) {
        if (looksLikeMessageKey(message)) {
            throw ValidationException.keyed(message);
        }
        throw new ValidationException(message);
    }

    /**
     * @deprecated 使用 {@link #badRequestKeyed(ResultCode, String, Object...)}。
     */
    @Deprecated(forRemoval = true)
    protected void badRequest(ResultCode code, String message) {
        if (looksLikeMessageKey(message)) {
            throw ValidationException.keyed(code, message);
        }
        throw new ValidationException(code, message);
    }

    /** @deprecated 使用 {@link UnauthorizedException#keyed(String, Object...)}。 */
    @Deprecated(forRemoval = true)
    protected void unauthorized(String message) {
        throw new UnauthorizedException(message);
    }

    /** @deprecated 使用 {@link UnauthorizedException#keyed(ResultCode, String, Object...)}。 */
    @Deprecated(forRemoval = true)
    protected void unauthorized(ResultCode code, String message) {
        throw new UnauthorizedException(code, message);
    }

    /** @deprecated 使用 {@link #forbiddenKeyed(ResultCode, String, Object...)}。 */
    @Deprecated(forRemoval = true)
    protected void forbidden(String message) {
        throw new ForbiddenException(message);
    }

    /** @deprecated 使用 {@link #forbiddenKeyed(ResultCode, String, Object...)}。 */
    @Deprecated(forRemoval = true)
    protected void forbidden(ResultCode code, String message) {
        throw new ForbiddenException(code, message);
    }

    /** @deprecated 使用 {@link TooManyRequestsException#keyed(String, Object...)}。 */
    @Deprecated(forRemoval = true)
    protected void tooManyRequests(String message) {
        throw new TooManyRequestsException(message);
    }

    private static boolean looksLikeMessageKey(String message) {
        return message != null && message.matches("^[a-z][a-z0-9_.]*$");
    }

    /**
     * @deprecated 使用 {@link #requireOwnerKeyed(Long, Long, ResultCode, String, Object...)}。
     */
    @Deprecated(forRemoval = true)
    protected void requireOwner(Long userId, Long ownerId, ResultCode forbiddenCode, String message) {
        if (!Objects.equals(userId, ownerId)) {
            if (looksLikeMessageKey(message)) {
                throw ForbiddenException.keyed(forbiddenCode, message);
            }
            throw new ForbiddenException(forbiddenCode, message);
        }
    }

    /**
     * @deprecated 使用 {@link #requireOwnerKeyed(Long, Long, ResultCode, String, Object...)}。
     */
    @Deprecated(forRemoval = true)
    protected void requireOwner(Long userId, Long ownerId, String message) {
        requireOwner(userId, ownerId, ResultCode.FORBIDDEN, message);
    }

    protected Long parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            throw UnauthorizedException.keyed("result.framework.not_logged_in");
        }
        try {
            return Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException ex) {
            throw ValidationException.keyed("result.framework.invalid_user_id");
        }
    }
}
