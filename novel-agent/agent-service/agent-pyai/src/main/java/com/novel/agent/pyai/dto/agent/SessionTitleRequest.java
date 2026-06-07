package com.novel.agent.pyai.dto.agent;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SessionTitleRequest(
    @NotBlank
    @Size(max = 2000)
    @JsonProperty("user_message")
    String userMessage,

    @Size(max = 800)
    @JsonProperty("assistant_snippet")
    String assistantSnippet,

    @Size(max = 200)
    @JsonProperty("novel_title")
    String novelTitle
) {}
