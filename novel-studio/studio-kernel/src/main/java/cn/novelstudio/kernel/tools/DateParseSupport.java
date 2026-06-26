package cn.novelstudio.kernel.tools;

import cn.novelstudio.kernel.exception.ValidationException;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * JPA 原生查询日期列解析（兼容 LocalDate / java.sql.Date / java.util.Date）。
 */
public final class DateParseSupport {

    private DateParseSupport() {}

    public static LocalDate toLocalDateUtc(Object value) {
        if (value == null) {
            throw ValidationException.keyed("result.framework.date_column_null");
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        }
        if (value instanceof java.util.Date utilDate) {
            return utilDate.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        }
        if (value instanceof String text) {
            return LocalDate.parse(text);
        }
        throw ValidationException.keyed("result.framework.date_type_unsupported", value.getClass().getName());
    }
}
