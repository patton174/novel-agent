package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.PythonAgentRunRequest;
import cn.novelstudio.module.agent.support.SseFrameAggregator;
import cn.novelstudio.module.agent.support.Utf8StreamingDecoder;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.codec.json.Jackson2JsonDecoder;
import org.springframework.http.codec.json.Jackson2JsonEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.http.HttpProtocol;
import reactor.netty.http.client.HttpClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Component
public class WebClientPythonAgentRunClient implements PythonAgentRunClient {

    private static final Logger log = LoggerFactory.getLogger(WebClientPythonAgentRunClient.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String internalServiceKey;

    public WebClientPythonAgentRunClient(
        ObjectMapper objectMapper,
        @Value("${agent.python.base-url:http://localhost:8000}") String baseUrl,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        HttpClient httpClient = HttpClient.create()
            .protocol(HttpProtocol.HTTP11)
            .responseTimeout(Duration.ZERO)
            .compress(false);
        ExchangeStrategies strategies = ExchangeStrategies.builder()
            .codecs(configurer -> {
                configurer.defaultCodecs().jackson2JsonEncoder(
                    new Jackson2JsonEncoder(objectMapper, MediaType.APPLICATION_JSON));
                configurer.defaultCodecs().jackson2JsonDecoder(
                    new Jackson2JsonDecoder(objectMapper, MediaType.APPLICATION_JSON));
            })
            .build();
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .baseUrl(baseUrl)
            .exchangeStrategies(strategies)
            .build();
        this.internalServiceKey = internalServiceKey;
    }

    @Override
    public Flux<String> runStream(PythonAgentRunRequest request) {
        byte[] body = encodeRunRequest(request);
        Flux<String> chunks = webClient.post()
            .uri("/internal/agent/run/stream")
            .header("X-Internal-Service-Key", internalServiceKey)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .body(BodyInserters.fromValue(body))
            .retrieve()
            .onStatus(
                status -> status.value() == 422,
                this::logAndWrapClientError
            )
            .bodyToFlux(DataBuffer.class)
            .transform(Utf8StreamingDecoder::decode)
            .doOnDiscard(DataBuffer.class, DataBufferUtils::release);

        return SseFrameAggregator.aggregate(chunks);
    }

    private byte[] encodeRunRequest(PythonAgentRunRequest request) {
        try {
            byte[] body = objectMapper.writeValueAsBytes(request);
            String preview = new String(body, StandardCharsets.UTF_8);
            if (body.length < 16 || !preview.contains("\"context\"")) {
                log.error("agent run stream payload invalid: bytes={} preview={}", body.length, preview);
                throw new IllegalStateException("agent.run.stream_payload_invalid");
            }
            return body;
        } catch (JsonProcessingException ex) {
            log.error("agent run stream payload serialize failed: {}", ex.getMessage());
            throw new IllegalStateException("agent.run.stream_payload_invalid", ex);
        }
    }

    private Mono<? extends Throwable> logAndWrapClientError(ClientResponse response) {
        return response.bodyToMono(String.class)
            .defaultIfEmpty("")
            .flatMap(body -> {
                log.error("python agent run stream 422: {}", body);
                return response.createException();
            });
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

    @Override
    public void pauseRun(String runId) {
        webClient.post()
            .uri("/api/agent/run/{runId}/pause", runId)
            .retrieve()
            .bodyToMono(Void.class)
            .timeout(Duration.ofSeconds(10))
            .onErrorComplete()
            .block();
    }

    @Override
    public void resumeRun(String runId) {
        webClient.post()
            .uri("/api/agent/run/{runId}/resume", runId)
            .retrieve()
            .bodyToMono(Void.class)
            .timeout(Duration.ofSeconds(10))
            .onErrorComplete()
            .block();
    }
}
