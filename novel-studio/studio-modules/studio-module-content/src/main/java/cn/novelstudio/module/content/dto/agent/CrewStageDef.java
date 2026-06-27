package cn.novelstudio.module.content.dto.agent;

import java.util.List;

public record CrewStageDef(
    String key,
    String profileId,
    String promptTemplate,
    String outputSchema,
    String gate,
    String onFail,
    List<String> skillIds
) {}
