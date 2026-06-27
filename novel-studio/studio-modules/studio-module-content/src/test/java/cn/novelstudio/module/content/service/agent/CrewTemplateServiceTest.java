package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.module.content.dto.agent.CrewStageDef;
import cn.novelstudio.module.content.entity.agent.AgentProfileEntity;
import cn.novelstudio.module.content.entity.agent.CrewTemplateEntity;
import cn.novelstudio.module.content.repository.agent.AgentProfileRepository;
import cn.novelstudio.module.content.repository.agent.CrewRunRepository;
import cn.novelstudio.module.content.repository.agent.CrewTemplateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrewTemplateServiceTest {

    @Mock
    CrewTemplateRepository repository;

    @Mock
    CrewRunRepository crewRunRepository;

    @Mock
    AgentProfileRepository profileRepository;

    @InjectMocks
    CrewTemplateService service;

    @Test
    void stagesSummaryForContext_includesKeyAndProfile() {
        CrewTemplateEntity entity = new CrewTemplateEntity();
        entity.setStagesJson(List.of(
            Map.of("key", "plan", "profileId", "main-editor", "gate", "always")
        ));

        List<Map<String, Object>> summary = service.stagesSummaryForContext(entity);

        assertThat(summary).hasSize(1);
        assertThat(summary.get(0).get("key")).isEqualTo("plan");
        assertThat(summary.get(0).get("profile_id")).isEqualTo("main-editor");
    }

    @Test
    void validateStages_acceptsSystemProfile() {
        when(profileRepository.findByIdAndIsSystemTrue("main-editor"))
            .thenReturn(Optional.of(new AgentProfileEntity()));

        List<Map<String, Object>> stages = service.validateStages(
            1L,
            List.of(new CrewStageDef(
                "plan",
                "main-editor",
                "Plan the chapter",
                "PlanResult",
                "always",
                "continue",
                null
            ))
        );

        assertThat(stages).hasSize(1);
        assertThat(stages.get(0).get("key")).isEqualTo("plan");
    }

    @Test
    void listForUser_loadsSystemTemplates() {
        CrewTemplateEntity entity = new CrewTemplateEntity();
        entity.setId("three-act-novel");
        entity.setDisplayName("三幕式长篇");
        entity.setIsSystem(true);
        entity.setStagesJson(List.of());
        when(repository.findByUserIdOrIsSystemTrueOrderByDisplayNameAsc(5L)).thenReturn(List.of(entity));

        var list = service.listForUser(5L);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo("three-act-novel");
    }

    @Test
    void createCrewRun_persistsRecord() {
        CrewTemplateEntity template = new CrewTemplateEntity();
        template.setId("three-act-novel");
        when(repository.findByIdAndIsSystemTrue("three-act-novel")).thenReturn(Optional.of(template));
        when(crewRunRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var run = service.createCrewRun(9L, "three-act-novel", "session_1", "run_1");

        assertThat(run.getCrewTemplateId()).isEqualTo("three-act-novel");
        assertThat(run.getRootRunId()).isEqualTo("run_1");
    }
}
