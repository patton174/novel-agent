package cn.novelstudio.module.content.service.agent;



import cn.novelstudio.kernel.exception.ValidationException;

import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;

import cn.novelstudio.module.content.dto.agent.UpdateAgentSkillRequest;

import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.entity.agent.UserSkillRefEntity;

import cn.novelstudio.module.content.repository.agent.AgentSkillRepository;

import cn.novelstudio.module.content.repository.agent.AgentSkillRevisionRepository;

import cn.novelstudio.module.content.repository.agent.UserSkillRefRepository;

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



    @Mock

    AgentSkillRevisionRepository revisionRepository;



    @Mock

    UserSkillRefRepository refRepository;



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

        UUID id4 = UUID.randomUUID();



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

        when(refRepository.findByUserIdAndSkillId(7L, system.getId())).thenReturn(Optional.of(refFor(system)));



        List<AgentSkillEntity> resolved = service.getForRun(7L, List.of("fanqie-chapter-hook"));



        assertThat(resolved).hasSize(1);

        assertThat(resolved.get(0).getName()).isEqualTo("fanqie-chapter-hook");

    }



    @Test

    void getForRun_skipsUnreferencedSystemSkill() {

        AgentSkillEntity system = skill(UUID.randomUUID(), null, true);

        system.setName("fanqie-chapter-hook");

        when(repository.findByNameAndIsSystemTrue("fanqie-chapter-hook")).thenReturn(Optional.of(system));

        when(refRepository.findByUserIdAndSkillId(7L, system.getId())).thenReturn(Optional.empty());



        List<AgentSkillEntity> resolved = service.getForRun(7L, List.of("fanqie-chapter-hook"));



        assertThat(resolved).isEmpty();

    }



    private static UserSkillRefEntity refFor(AgentSkillEntity system) {

        UserSkillRefEntity ref = new UserSkillRefEntity();

        ref.setUserId(7L);

        ref.setSkillId(system.getId());

        ref.setPinnedVersion(1);

        ref.setAutoUpdate(false);

        return ref;

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



    @Test

    void updateSystemSkill_archivesRevisionBeforeBump() {

        UUID id = UUID.randomUUID();

        AgentSkillEntity existing = skill(id, null, true);

        existing.setName("fanqie-chapter-hook");

        existing.setVersion(2);

        existing.setContent("v2 body");

        existing.setLocale("zh");

        existing.setToolsJson(List.of("ReadChapter"));

        when(repository.findById(id)).thenReturn(Optional.of(existing));

        when(revisionRepository.findBySkillIdAndVersion(id, 2)).thenReturn(Optional.empty());

        when(revisionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));



        var dto = service.updateSystemSkill(

            id,

            new UpdateAgentSkillRequest(2, "new desc", "v3 body", List.of("ReadChapter"), "zh")

        );



        assertThat(dto.version()).isEqualTo(3);

        verify(revisionRepository).save(any());

        assertThat(existing.getContent()).isEqualTo("v3 body");

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


