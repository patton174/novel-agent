package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.PythonAgentRunRequest;
import cn.novelstudio.module.agent.support.SseFrameAggregator;
import cn.novelstudio.module.agent.support.Utf8StreamingDecoder;
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

import java.time.Duration;
import java.util.Map;

@Component
public class WebClientPythonAgentRunClient implements PythonAgentRunClient {

    private final WebClient webClient;
    private final String internalServiceKey;

    public WebClientPythonAgentRunClient(
        @Value("${agent.python.base-url:http://localhost:8000}") String baseUrl,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ZERO)
            .compress(false);
        this.webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .baseUrl(baseUrl)
            .build();
        this.internalServiceKey = internalServiceKey;
    }

    @Override
    public Flux<String> runStream(PythonAgentRunRequest request) {
        Flux<String> chunks = webClient.post()
            .uri("/internal/agent/run/stream")
            .header("X-Internal-Service-Key", internalServiceKey)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(DataBuffer.class)
            .transform(Utf8StreamingDecoder::decode)
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
}
