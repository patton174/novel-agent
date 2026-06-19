package cn.novelstudio.module.agent.support;

import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * Cold-start warmup: JDBC pool, Redis, Python health — runs once after app ready.
 */
@Component
public class AgentRuntimeWarmup {

    private static final Logger log = LoggerFactory.getLogger(AgentRuntimeWarmup.class);

    private final AgentRuntimeProperties runtimeProperties;
    private final DataSource dataSource;
    private final StringRedisTemplate redisTemplate;

    public AgentRuntimeWarmup(
        AgentRuntimeProperties runtimeProperties,
        DataSource dataSource,
        StringRedisTemplate redisTemplate
    ) {
        this.runtimeProperties = runtimeProperties;
        this.dataSource = dataSource;
        this.redisTemplate = redisTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (!runtimeProperties.warmupEnabled()) {
            log.info("Agent runtime warmup disabled");
            return;
        }
        CompletableFuture.runAsync(this::runWarmup);
    }

    private void runWarmup() {
        long started = System.currentTimeMillis();
        warmDatabase();
        if (runtimeProperties.warmupRedisPing()) {
            warmRedis();
        }
        if (runtimeProperties.warmupPythonPing()) {
            warmPython();
        }
        log.info("Agent runtime warmup finished in {}ms", System.currentTimeMillis() - started);
    }

    private void warmDatabase() {
        try (Connection conn = dataSource.getConnection()) {
            conn.prepareStatement("SELECT 1").execute();
            log.info("Agent warmup: JDBC pool ready");
        } catch (Exception ex) {
            log.warn("Agent warmup: JDBC ping failed: {}", ex.getMessage());
        }
    }

    private void warmRedis() {
        try {
            redisTemplate.hasKey("__agent_warmup__");
            log.info("Agent warmup: Redis connection ready");
        } catch (Exception ex) {
            log.warn("Agent warmup: Redis ping failed: {}", ex.getMessage());
        }
    }

    private void warmPython() {
        String base = runtimeProperties.pythonBaseUrl();
        if (base == null || base.isBlank()) {
            return;
        }
        String url = base.replaceAll("/+$", "") + "/api/health";
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            log.info("Agent warmup: Python AI reachable status={}", response.statusCode());
        } catch (Exception ex) {
            log.warn("Agent warmup: Python ping failed url={}: {}", url, ex.getMessage());
        }
    }
}
