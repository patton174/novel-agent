package cn.novelstudio.module.content.service.crawl.dto;

import java.util.List;

public record OrchestratorDecisionsDTO(
    List<OrchestratorDecisionDTO> logs,
    long maxSeq
) {}
