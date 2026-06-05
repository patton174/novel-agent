package com.novel.agent.content.service.crm.resp;

import java.time.LocalDate;

public record CrmTrendPointResp(
    LocalDate date,
    long count
) {}
