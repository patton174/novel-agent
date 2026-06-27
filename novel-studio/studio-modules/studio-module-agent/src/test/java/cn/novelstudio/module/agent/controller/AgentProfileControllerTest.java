package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.AgentProfileBiz;
import cn.novelstudio.module.content.dto.agent.AgentProfileDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentProfileRequest;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AgentProfileControllerTest {

    @Mock
    AgentProfileBiz biz;

    MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AgentProfileController(biz)).build();
    }

    @Test
    void list_returns200() throws Exception {
        AgentProfileDTO profile = new AgentProfileDTO();
        profile.setId("chapter-writer");
        profile.setDisplayName("章节写手");
        profile.setIsSystem(true);
        when(biz.list(7L)).thenReturn(Result.ok(List.of(profile)));

        mockMvc.perform(get("/api/agent/profiles").header("X-User-Id", "7"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].id").value("chapter-writer"));
    }

    @Test
    void create_returns201() throws Exception {
        CreateAgentProfileRequest request = new CreateAgentProfileRequest(
            "My Writer",
            "desc",
            "You write chapters.",
            List.of("WriteChapter"),
            null,
            20,
            null,
            List.of()
        );
        AgentProfileDTO created = new AgentProfileDTO();
        created.setId("abc123");
        created.setDisplayName("My Writer");
        created.setSystemPromptTemplate("You write chapters.");
        when(biz.create(eq(7L), any(CreateAgentProfileRequest.class))).thenReturn(Result.ok(created));

        mockMvc.perform(post("/api/agent/profiles")
                .header("X-User-Id", "7")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.display_name").value("My Writer"));
    }
}
