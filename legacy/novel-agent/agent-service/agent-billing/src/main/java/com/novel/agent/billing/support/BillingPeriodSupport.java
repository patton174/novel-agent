package com.novel.agent.billing.support;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class BillingPeriodSupport {

    private static final DateTimeFormatter YYYY_MM = DateTimeFormatter.ofPattern("yyyy-MM");

    private BillingPeriodSupport() {
    }

    public static String currentPeriodYyyyMm() {
        return YYYY_MM.withZone(ZoneOffset.UTC).format(Instant.now());
    }

    public static Instant monthStartUtc(String periodYyyyMm) {
        return java.time.YearMonth.parse(periodYyyyMm).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    public static Instant monthEndUtc(String periodYyyyMm) {
        return java.time.YearMonth.parse(periodYyyyMm).plusMonths(1).atDay(1)
            .atStartOfDay(ZoneOffset.UTC).minusNanos(1).toInstant();
    }
}
