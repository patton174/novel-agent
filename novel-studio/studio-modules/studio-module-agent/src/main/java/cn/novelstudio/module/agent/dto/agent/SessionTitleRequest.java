package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SessionTitleRequest(
    @NotBlank(message = "{validation.agent.user_message_required}")
    @Size(max = 2000, message = "{validation.agent.user_message_max}")
    @JsonProperty("user_message")
    String userMessage,

    @Size(max = 800, message = "{validation.agent.assistant_snippet_max}")
    @JsonProperty("assistant_snippet")
    String assistantSnippet,

    @Size(max = 200, message = "{validation.agent.novel_title_max}")
    @JsonProperty("novel_title")
    String novelTitle
) {}
