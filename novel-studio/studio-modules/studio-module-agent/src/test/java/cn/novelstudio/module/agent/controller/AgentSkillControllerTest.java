package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.AgentSkillBiz;
import cn.novelstudio.module.content.dto.agent.AgentSkillDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentSkillRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AgentSkillControllerTest {

    @Mock
    AgentSkillBiz biz;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AgentSkillController(biz)).build();
    }

    @Test
    void list_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(biz.list(7L)).thenReturn(Result.ok(List.of(
            new AgentSkillDTO(id, "my-hook", "desc", "zh", false, List.of(), 1, null, null, null, null, true, true)
        )));

        mockMvc.perform(get("/api/agent/skills").header("X-User-Id", "7"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].name").value("my-hook"));
    }

    @Test
    void create_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        CreateAgentSkillRequest request = new CreateAgentSkillRequest(
            "my-hook",
            "desc",
            "# body",
            List.of("ReadChapter"),
            "zh"
        );
        when(biz.create(eq(7L), any(CreateAgentSkillRequest.class))).thenReturn(Result.ok(
            new AgentSkillDTO(id, "my-hook", "desc", "zh", false, List.of("ReadChapter"), 1, "# body", null, null, null, true, true)
        ));

        mockMvc.perform(post("/api/agent/skills")
                .header("X-User-Id", "7")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content").value("# body"));
    }
}
