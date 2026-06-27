package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import cn.novelstudio.module.content.entity.KgRelationEntity;
import cn.novelstudio.module.content.repository.KgEntityRepository;
import cn.novelstudio.module.content.repository.KgIngestErrorRepository;
import cn.novelstudio.module.content.repository.KgRelationRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KgServiceTest {

    @Mock
    KgEntityRepository entityRepo;

    @Mock
    KgRelationRepository relationRepo;

    @Mock
    KgIngestErrorRepository errorRepo;

    @InjectMocks
    KgService svc;

    @Test
    void upsert_newEntity_inserts() {
        when(entityRepo.findByNovelIdAndName("n1", "林动")).thenReturn(Optional.empty());
        when(entityRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        svc.upsertChapter(
            "n1",
            "c1",
            List.of(Map.of("name", "林动", "type", "character")),
            List.of()
        );
        verify(entityRepo).save(any());
    }

    @Test
    void upsert_existingEntity_mergesAliases() {
        KgEntityEntity existing = new KgEntityEntity();
        existing.setName("林动");
        existing.setType("character");
        existing.setAliases("林动(少年)");
        when(entityRepo.findByNovelIdAndName("n1", "林动")).thenReturn(Optional.of(existing));
        when(entityRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        svc.upsertChapter(
            "n1",
            "c1",
            List.of(Map.of("name", "林动", "type", "character", "aliases", "林动(幼年)")),
            List.of()
        );
        assertThat(existing.getAliases()).contains("林动(少年)").contains("林动(幼年)");
    }

    @Test
    void clearNovel_deletesEntitiesAndRelations() {
        svc.clearNovel("n1");
        verify(entityRepo).deleteByNovelId("n1");
        verify(relationRepo).deleteByNovelId("n1");
    }

    @Test
    void getGraph_addsStubNodesForRelationEndpoints() {
        KgEntityEntity known = new KgEntityEntity();
        known.setName("小明");
        known.setType("character");
        KgRelationEntity rel = new KgRelationEntity();
        rel.setSrcName("小明");
        rel.setDstName("单身");
        rel.setRel("状态");

        when(entityRepo.findByNovelId("n1")).thenReturn(List.of(known));
        when(relationRepo.findByNovelId("n1")).thenReturn(List.of(rel));
        when(errorRepo.countByNovelId("n1")).thenReturn(0L);

        Map<String, Object> graph = svc.getGraph("n1");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) graph.get("nodes");

        assertThat(nodes).hasSize(2);
        assertThat(nodes.stream().map(n -> n.get("id")).toList()).containsExactlyInAnyOrder("小明", "单身");
    }
}
