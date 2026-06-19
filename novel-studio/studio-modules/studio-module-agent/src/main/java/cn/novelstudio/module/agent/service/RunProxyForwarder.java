package cn.novelstudio.module.agent.service;

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
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

/**
 * Transparent SSE forward to the owner Java pod (sticky resume).
 */
@Component
public class RunProxyForwarder {

    private final WebClient webClient;
    private final String internalServiceKey;

    public RunProxyForwarder(
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ZERO)
            .compress(false);
        this.webClient = WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
        this.internalServiceKey = internalServiceKey;
    }

    public Flux<String> forwardResume(String ownerBaseUrl, Long userId, String runId, int afterSequence) {
        String base = ownerBaseUrl == null ? "" : ownerBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        Flux<String> chunks = webClient.post()
            .uri(base + "/internal/agent/runs/{runId}/stream/resume?after_sequence={afterSequence}", runId, afterSequence)
            .header("X-User-Id", String.valueOf(userId))
            .header("X-Internal-Service-Key", internalServiceKey)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .retrieve()
            .bodyToFlux(DataBuffer.class)
            .transform(Utf8StreamingDecoder::decode)
            .doOnDiscard(DataBuffer.class, DataBufferUtils::release);
        return SseFrameAggregator.aggregate(chunks);
    }
}
