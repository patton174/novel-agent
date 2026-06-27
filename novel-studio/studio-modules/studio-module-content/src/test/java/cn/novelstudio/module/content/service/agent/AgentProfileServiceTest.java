package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.dto.agent.CreateAgentProfileRequest;
import cn.novelstudio.module.content.dto.agent.UpdateAgentProfileRequest;
import cn.novelstudio.module.content.entity.agent.AgentProfileEntity;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.repository.agent.AgentProfileRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentProfileServiceTest {

    @Mock
    AgentProfileRepository repository;

    @Mock
    AgentSkillService skillService;

    @InjectMocks
    AgentProfileService service;

    @Test
    void getForRun_systemProfile_accessibleToAnyUser() {
        AgentProfileEntity system = profile("main-editor", null, true);
        when(repository.findByIdAndIsSystemTrue("main-editor")).thenReturn(Optional.of(system));

        AgentProfileEntity resolved = service.getForRun(7L, "main-editor");

        assertThat(resolved.getId()).isEqualTo("main-editor");
        assertThat(resolved.getIsSystem()).isTrue();
    }

    @Test
    void getForRun_userProfile_requiresOwner() {
        AgentProfileEntity userProfile = profile("user-prof-1", 7L, false);
        when(repository.findByIdAndIsSystemTrue("user-prof-1")).thenReturn(Optional.empty());
        when(repository.findByIdAndUserId("user-prof-1", 7L)).thenReturn(Optional.of(userProfile));

        assertThat(service.getForRun(7L, "user-prof-1").getUserId()).isEqualTo(7L);
    }

    @Test
    void resolveToolAllowlist_emptyMeansUnrestricted() {
        AgentProfileEntity profile = profile("main-editor", null, true);
        profile.setToolAllowlistJson(List.of());

        assertThat(service.resolveToolAllowlist(profile)).isNull();
    }

    @Test
    void resolveToolAllowlist_filtersUnknownTools() {
        AgentProfileEntity profile = profile("chapter-writer", null, true);
        profile.setToolAllowlistJson(List.of("ReadChapter", "NotARealTool", "WriteChapter"));

        assertThat(service.resolveToolAllowlist(profile)).containsExactly("ReadChapter", "WriteChapter");
    }

    @Test
    void resolveSkillIds_delegatesToSkillService() {
        AgentProfileEntity profile = profile("chapter-writer", null, true);
        profile.setSkillIdsJson(List.of("fanqie-chapter-hook"));
        AgentSkillEntity skill = new AgentSkillEntity();
        skill.setName("fanqie-chapter-hook");
        when(skillService.getForRun(eq(7L), eq(List.of("fanqie-chapter-hook")))).thenReturn(List.of(skill));

        List<AgentSkillEntity> resolved = service.resolveSkillIds(7L, profile);

        assertThat(resolved).hasSize(1);
        assertThat(resolved.get(0).getName()).isEqualTo("fanqie-chapter-hook");
    }

    @Test
    void create_success_persistsUserProfile() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.create(
            7L,
            new CreateAgentProfileRequest(
                "My Writer",
                "desc",
                "You write chapters.",
                List.of("ReadChapter", "WriteChapter"),
                null,
                15,
                null,
                List.of("skill-a")
            )
        );

        assertThat(dto.getDisplayName()).isEqualTo("My Writer");
        assertThat(dto.getIsSystem()).isFalse();
        assertThat(dto.getMaxTurns()).isEqualTo(15);
        assertThat(dto.getToolAllowlist()).containsExactly("ReadChapter", "WriteChapter");

        ArgumentCaptor<AgentProfileEntity> captor = ArgumentCaptor.forClass(AgentProfileEntity.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(7L);
        assertThat(captor.getValue().getId()).isNotBlank();
    }

    @Test
    void update_systemProfile_fails() {
        AgentProfileEntity system = profile("main-editor", null, true);
        when(repository.findByIdAndUserId("main-editor", 7L)).thenReturn(Optional.of(system));

        assertThatThrownBy(() -> service.update(
            7L,
            "main-editor",
            new UpdateAgentProfileRequest("x", null, "prompt", List.of(), null, 20, null, List.of())
        ))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("agent.profile.system_readonly");

        verify(repository, never()).save(any());
    }

    @Test
    void delete_systemProfile_fails() {
        AgentProfileEntity system = profile("main-editor", null, true);
        when(repository.findByIdAndUserId("main-editor", 7L)).thenReturn(Optional.of(system));

        assertThatThrownBy(() -> service.delete(7L, "main-editor"))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("agent.profile.system_readonly");

        verify(repository, never()).save(any());
    }

    @Test
    void cloneSystem_createsUserCopyWithNewId() {
        AgentProfileEntity system = profile("chapter-writer", null, true);
        system.setDisplayName("章节写手");
        system.setSystemPromptTemplate("writer prompt");
        system.setToolAllowlistJson(List.of("ReadChapter"));
        when(repository.findByIdAndIsSystemTrue("chapter-writer")).thenReturn(Optional.of(system));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.cloneSystem(7L, "chapter-writer");

        assertThat(dto.getIsSystem()).isFalse();
        assertThat(dto.getDisplayName()).contains("章节写手");
        assertThat(dto.getId()).isNotEqualTo("chapter-writer");

        ArgumentCaptor<AgentProfileEntity> captor = ArgumentCaptor.forClass(AgentProfileEntity.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(7L);
        assertThat(captor.getValue().getIsSystem()).isFalse();
    }

    private static AgentProfileEntity profile(String id, Long userId, boolean system) {
        AgentProfileEntity entity = new AgentProfileEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setDisplayName("profile-" + id);
        entity.setSystemPromptTemplate("prompt");
        entity.setMaxTurns(20);
        entity.setIsSystem(system);
        entity.setToolAllowlistJson(List.of());
        entity.setSkillIdsJson(List.of());
        return entity;
    }
}
