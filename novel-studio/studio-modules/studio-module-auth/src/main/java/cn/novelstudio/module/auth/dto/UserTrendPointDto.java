package cn.novelstudio.module.auth.dto;

import java.time.LocalDate;

public record UserTrendPointDto(
    LocalDate date,
    long count
) {}
