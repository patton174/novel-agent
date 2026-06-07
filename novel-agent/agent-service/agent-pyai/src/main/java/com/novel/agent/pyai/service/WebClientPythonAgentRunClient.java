package com.novel.agent.pyai.service;

import com.novel.agent.pyai.dto.agent.PythonAgentRunRequest;
import com.novel.agent.pyai.support.SseFrameAggregator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Component
public class WebClientPythonAgentRunClient implements PythonAgentRunClient {

    private final WebClient webClient;

    public WebClientPythonAgentRunClient(
        @Value("${agent.python.base-url:http://localhost:8000}") String baseUrl
    ) {
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ZERO)
            .compress(false);
        this.webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .baseUrl(baseUrl)
            .build();
    }

    @Override
    public Flux<String> runStream(PythonAgentRunRequest request) {
        Flux<String> chunks = webClient.post()
            .uri("/api/agent/run/stream")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(DataBuffer.class)
            .map(this::decodeUtf8)
            .doOnDiscard(DataBuffer.class, DataBufferUtils::release);

        return SseFrameAggregator.aggregate(chunks);
    }

    @Override
    public void submitInteraction(String runId, Map<String, Object> payload) {
        webClient.post()
            .uri("/api/agent/run/{runId}/interaction", runId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(Void.class)
            .timeout(Duration.ofSeconds(30))
            .block();
    }

    @Override
    public void abortRun(String runId) {
        webClient.post()
            .uri("/api/agent/run/{runId}/abort", runId)
            .retrieve()
            .bodyToMono(Void.class)
            .timeout(Duration.ofSeconds(10))
            .onErrorComplete()
            .block();
    }

    private String decodeUtf8(DataBuffer dataBuffer) {
        byte[] bytes = new byte[dataBuffer.readableByteCount()];
        dataBuffer.read(bytes);
        DataBufferUtils.release(dataBuffer);
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
