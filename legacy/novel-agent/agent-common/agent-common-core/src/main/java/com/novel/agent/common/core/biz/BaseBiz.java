package com.novel.agent.common.core.biz;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.PageQuery;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.core.exception.ForbiddenException;
import java.util.Objects;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.common.core.exception.TooManyRequestsException;
import com.novel.agent.common.core.exception.UnauthorizedException;
import com.novel.agent.common.core.exception.ValidationException;

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
            throw BizException.of(code, message);
        }
    }

    protected void notFound(String message) {
        throw new NotFoundException(message);
    }

    protected void notFound(ResultCode code, String message) {
        throw new NotFoundException(code, message);
    }

    protected void badRequest(String message) {
        throw new ValidationException(message);
    }

    protected void badRequest(ResultCode code, String message) {
        throw new ValidationException(code, message);
    }

    protected void unauthorized(String message) {
        throw new UnauthorizedException(message);
    }

    protected void unauthorized(ResultCode code, String message) {
        throw new UnauthorizedException(code, message);
    }

    protected void forbidden(String message) {
        throw new ForbiddenException(message);
    }

    protected void forbidden(ResultCode code, String message) {
        throw new ForbiddenException(code, message);
    }

    protected void tooManyRequests(String message) {
        throw new TooManyRequestsException(message);
    }

    protected void requireOwner(Long userId, Long ownerId, ResultCode forbiddenCode, String message) {
        if (!Objects.equals(userId, ownerId)) {
            throw new ForbiddenException(forbiddenCode, message);
        }
    }

    protected void requireOwner(Long userId, Long ownerId, String message) {
        requireOwner(userId, ownerId, ResultCode.FORBIDDEN, message);
    }

    protected Long parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            throw new UnauthorizedException("未登录");
        }
        try {
            return Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException ex) {
            throw new ValidationException("用户标识无效");
        }
    }
}
