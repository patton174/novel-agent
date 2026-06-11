package cn.novelstudio.integration.auth.dto;

import java.time.LocalDate;

public record FeignTrendPointDto(
    LocalDate date,
    long count
) {}
