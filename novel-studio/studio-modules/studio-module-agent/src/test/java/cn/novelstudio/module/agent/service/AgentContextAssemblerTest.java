package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.support.AgentLocaleMarkers;
import cn.novelstudio.module.content.dto.ReferencedBookDTO;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.service.agent.AgentSkillService;
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

    AgentContextAssembler assembler;

    @BeforeEach
    void setUp() {
        assembler = new AgentContextAssembler(
            memoryService,
            novelContextClient,
            localeMarkers,
            catalogService,
            agentSkillService
        );
        when(memoryService.loadHistory(any(), any(), any(Integer.class))).thenReturn(List.of());
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
            null
        );

        Map<String, Object> context = assembler.assemble(9L, "sess-1", request);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> referencedBooks = (List<Map<String, Object>>) context.get("referenced_books");
        assertThat(referencedBooks).hasSize(1);
        assertThat(referencedBooks.get(0).get("summary")).asString().hasSize(800);
    }

    @Test
    void skillIds_injectsSkillPromptAndMetadata() {
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
            List.of("fanqie-hook")
        );

        Map<String, Object> context = assembler.assemble(5L, "sess-2", request);

        assertThat(context.get("skill_prompt")).asString().contains("fanqie-hook");
        assertThat(context.get("skill_prompt")).asString().contains("Use a strong opening.");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> skills = (List<Map<String, Object>>) context.get("skills");
        assertThat(skills).hasSize(1);
        assertThat(skills.get(0).get("name")).isEqualTo("fanqie-hook");
    }

    @Test
    void emptySkillIds_doesNotWriteSkillKeys() {
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
            List.of()
        );

        Map<String, Object> context = assembler.assemble(3L, "sess-3", request);

        assertThat(context).doesNotContainKeys("skills", "skill_ids", "skill_prompt");
        verify(agentSkillService, never()).getForRun(any(), any());
    }
}
