package cn.novelstudio.module.content.service.crawl.dto;

import jakarta.validation.constraints.Size;

public record SetOrchestratorGoalRequest(
    @Size(max = 4000) String goal
) {}
