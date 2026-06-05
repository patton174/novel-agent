package com.novel.agent.feign.auth.dto;

import java.time.LocalDate;

public record FeignTrendPointDto(
    LocalDate date,
    long count
) {}
