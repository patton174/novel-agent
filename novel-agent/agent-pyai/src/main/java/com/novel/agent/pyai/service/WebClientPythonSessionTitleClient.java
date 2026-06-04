package com.novel.agent.pyai.service;

import com.novel.agent.pyai.dto.agent.SessionTitleResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Map;

@Component
public class WebClientPythonSessionTitleClient implements PythonSessionTitleClient {

    private static final Logger log = LoggerFactory.getLogger(WebClientPythonSessionTitleClient.class);

    private final WebClient webClient;

    public WebClientPythonSessionTitleClient(
        @Value("${agent.python.base-url:http://localhost:8000}") String baseUrl
    ) {
        HttpClient httpClient = HttpClient.create().responseTimeout(Duration.ofSeconds(45));
        this.webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .baseUrl(baseUrl)
            .build();
    }

    @Override
    public String generateTitle(String userMessage, String assistantSnippet, String novelTitle) {
        try {
            SessionTitleResponse body = webClient.post()
                .uri("/api/agent/session/title")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                    "user_message", userMessage == null ? "" : userMessage,
                    "assistant_snippet", assistantSnippet == null ? "" : assistantSnippet,
                    "novel_title", novelTitle == null ? "" : novelTitle
                ))
                .retrieve()
                .bodyToMono(SessionTitleResponse.class)
                .timeout(Duration.ofSeconds(40))
                .block();
            if (body == null || body.title() == null) {
                return null;
            }
            String title = body.title().trim();
            return title.isBlank() ? null : title;
        } catch (Exception ex) {
            log.warn("Python session title failed: {}", ex.toString());
            return null;
        }
    }
}
