package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.repository.agent.AgentSkillRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentSkillServiceTest {

    @Mock
    AgentSkillRepository repository;

    @InjectMocks
    AgentSkillService service;

    @Test
    void create_success_persistsUserSkill() {
        when(repository.findByNameAndUserId("my-hook", 7L)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.create(
            7L,
            new CreateAgentSkillRequest(
                "my-hook",
                "desc",
                "# Skill body",
                List.of("ReadChapter"),
                "zh"
            )
        );

        assertThat(dto.name()).isEqualTo("my-hook");
        assertThat(dto.isSystem()).isFalse();
        assertThat(dto.version()).isEqualTo(1);
        assertThat(dto.content()).isEqualTo("# Skill body");

        ArgumentCaptor<AgentSkillEntity> captor = ArgumentCaptor.forClass(AgentSkillEntity.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(7L);
        assertThat(captor.getValue().getToolsJson()).containsExactly("ReadChapter");
    }

    @Test
    void create_duplicateName_fails() {
        AgentSkillEntity existing = new AgentSkillEntity();
        existing.setName("my-hook");
        when(repository.findByNameAndUserId("my-hook", 7L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(
            7L,
            new CreateAgentSkillRequest("my-hook", null, "body", null, null)
        ))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("agent.skill.name_taken");

        verify(repository, never()).save(any());
    }

    @Test
    void getForRun_limitsToThreeSkills() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        UUID id3 = UUID.randomUUID();
        UUID id4 = UUID.randomUUID(); // fourth id must be ignored

        when(repository.findById(id1)).thenReturn(Optional.of(skill(id1, 7L, false)));
        when(repository.findById(id2)).thenReturn(Optional.of(skill(id2, 7L, false)));
        when(repository.findById(id3)).thenReturn(Optional.of(skill(id3, 7L, false)));

        List<AgentSkillEntity> resolved = service.getForRun(
            7L,
            List.of(id1.toString(), id2.toString(), id3.toString(), id4.toString())
        );

        assertThat(resolved).hasSize(3);
        assertThat(resolved).extracting(AgentSkillEntity::getId).containsExactly(id1, id2, id3);
    }

    @Test
    void getForRun_resolvesSystemSlug() {
        AgentSkillEntity system = skill(UUID.randomUUID(), null, true);
        system.setName("fanqie-chapter-hook");
        when(repository.findByNameAndIsSystemTrue("fanqie-chapter-hook")).thenReturn(Optional.of(system));

        List<AgentSkillEntity> resolved = service.getForRun(7L, List.of("fanqie-chapter-hook"));

        assertThat(resolved).hasSize(1);
        assertThat(resolved.get(0).getName()).isEqualTo("fanqie-chapter-hook");
    }

    @Test
    void update_systemSkill_fails() {
        UUID id = UUID.randomUUID();
        AgentSkillEntity system = skill(id, null, true);
        when(repository.findByIdAndUserId(id, 7L)).thenReturn(Optional.of(system));

        assertThatThrownBy(() -> service.update(
            7L,
            id,
            new UpdateAgentSkillRequest(1, "x", "body", List.of(), "zh")
        ))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("agent.skill.system_readonly");

        verify(repository, never()).save(any());
    }

    @Test
    void sanitizeContent_stripsScriptTags() {
        String sanitized = AgentSkillService.sanitizeContent("Hello<script>alert(1)</script>");
        assertThat(sanitized).doesNotContain("<script");
        assertThat(sanitized).startsWith("Hello");
    }

    private static AgentSkillEntity skill(UUID id, Long userId, boolean system) {
        AgentSkillEntity entity = new AgentSkillEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setName("skill-" + id.toString().substring(0, 8));
        entity.setVersion(1);
        entity.setContent("body");
        entity.setIsSystem(system);
        return entity;
    }
}
