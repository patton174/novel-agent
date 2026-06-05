package com.novel.agent.common.core.tools;

import com.novel.agent.common.core.exception.ValidationException;

import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * JPA 原生查询日期列解析（兼容 LocalDate / java.sql.Date / java.util.Date）。
 */
public final class DateParseSupport {

    private DateParseSupport() {}

    public static LocalDate toLocalDateUtc(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof java.util.Date utilDate) {
            return utilDate.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        }
        throw new ValidationException("Unsupported date type: " + value.getClass().getName());
    }
}
