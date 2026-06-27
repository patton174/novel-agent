package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.support.AgentLocaleMarkers;
import cn.novelstudio.module.content.dto.ReferencedBookDTO;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.service.agent.AgentProfileService;
import cn.novelstudio.module.content.service.agent.AgentSkillService;
import cn.novelstudio.module.content.service.agent.CrewTemplateService;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentContextAssemblerTest {

    @Mock
    AgentSessionMemoryService memoryService;

    @Mock
    NovelContextClient novelContextClient;

    @Mock
    AgentLocaleMarkers localeMarkers;

    @Mock
    CatalogService catalogService;

    @Mock
    AgentSkillService agentSkillService;

    @Mock
    AgentProfileService agentProfileService;

    @Mock
    CrewTemplateService crewTemplateService;

    AgentContextAssembler assembler;

    @BeforeEach
    void setUp() {
        assembler = new AgentContextAssembler(
            memoryService,
            novelContextClient,
            localeMarkers,
            catalogService,
            agentSkillService,
            agentProfileService,
            crewTemplateService
        );
        when(memoryService.loadHistory(any(), any(), any(Integer.class))).thenReturn(List.of());
    }

    @Test
    void historyTurns_includeCreatedAtFromPersistence() {
        long ts = 1_700_000_000_000L;
        when(memoryService.loadHistory(any(), any(), any(Integer.class))).thenReturn(
            List.of(
                new AgentSessionMemoryService.HistoryTurn("user", "hello", "", ts - 1000),
                new AgentSessionMemoryService.HistoryTurn("assistant", "world", "", ts)
            )
        );

        AgentStreamRequest request = new AgentStreamRequest(
            "continue",
            null,
            false,
            null,
            "sess-ts",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );

        Map<String, Object> context = assembler.assemble(1L, "sess-ts", request);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) context.get("history");
        assertThat(history).hasSize(2);
        assertThat(history.get(0).get("created_at")).isEqualTo(ts - 1000);
        assertThat(history.get(1).get("created_at")).isEqualTo(ts);
    }

    @Test
    void referencedBooks_summaryTruncatedTo800Chars() {
        String longSummary = "x".repeat(1200);
        ReferencedBookDTO book = new ReferencedBookDTO();
        book.setCatalogNovelId("cat-1");
        book.setTitle("Book");
        book.setSummary(longSummary);
        book.setChapterTitles(List.of("Ch1"));
        book.setNamespace("library:1:cat-1");
        book.setIndexStatus("indexed");

        when(catalogService.getReferencedBook("cat-1", 9L)).thenReturn(book);

        AgentStreamRequest request = new AgentStreamRequest(
            "hello",
            null,
            false,
            null,
            "sess-1",
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(new AgentStreamRequest.ReferencedBookRef("cat-1")),
            null,
            null,
            null,
            null
        );

        Map<String, Object> context = assembler.assemble(9L, "sess-1", request);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> referencedBooks = (List<Map<String, Object>>) context.get("referenced_books");
        assertThat(referencedBooks).hasSize(1);
        assertThat(referencedBooks.get(0).get("summary")).asString().hasSize(800);
    }

    @Test
    void skillIds_userSpecified_injectsSkillPromptAndMetadata() {
        UUID skillId = UUID.randomUUID();
        AgentSkillEntity skill = new AgentSkillEntity();
        skill.setId(skillId);
        skill.setName("fanqie-hook");
        skill.setDescription("hook desc");
        skill.setContent("Use a strong opening.");

        when(agentSkillService.getForRun(eq(5L), eq(List.of("fanqie-hook")))).thenReturn(List.of(skill));

        AgentStreamRequest request = new AgentStreamRequest(
            "write chapter",
            null,
            false,
            null,
            "sess-2",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of("fanqie-hook"),
            null,
            null,
            null
        );

        Map<String, Object> context = assembler.assemble(5L, "sess-2", request);

        assertThat(context.get("skill_prompt")).asString().contains("Use a strong opening.");
        assertThat(context.get("skills_user_specified")).isEqualTo(true);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> skills = (List<Map<String, Object>>) context.get("skills");
        assertThat(skills).hasSize(1);
        assertThat(skills.get(0).get("name")).isEqualTo("fanqie-hook");
        assertThat(skills.get(0).get("user_specified")).isEqualTo(true);
    }

    @Test
    void emptySkillIds_injectsEnabledCatalogOnly() {
        AgentSkillEntity skill = new AgentSkillEntity();
        skill.setId(UUID.randomUUID());
        skill.setName("catalog-skill");
        skill.setDescription("desc");
        skill.setEnabled(true);

        when(agentSkillService.listEnabledForCatalog(3L)).thenReturn(List.of(skill));

        AgentStreamRequest request = new AgentStreamRequest(
            "hello",
            null,
            false,
            null,
            "sess-3",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(),
            null,
            null,
            null
        );

        Map<String, Object> context = assembler.assemble(3L, "sess-3", request);

        assertThat(context).doesNotContainKeys("skill_prompt", "skills_user_specified");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> skills = (List<Map<String, Object>>) context.get("skills");
        assertThat(skills).hasSize(1);
        assertThat(skills.get(0).get("name")).isEqualTo("catalog-skill");
        verify(agentSkillService, never()).getForRun(any(), any());
        verify(agentSkillService).listEnabledForCatalog(3L);
    }
}
