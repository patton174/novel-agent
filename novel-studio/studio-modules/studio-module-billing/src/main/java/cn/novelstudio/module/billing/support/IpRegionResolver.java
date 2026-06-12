package cn.novelstudio.module.billing.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@Component
public class IpRegionResolver {

    private static final Duration TIMEOUT = Duration.ofSeconds(2);

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(TIMEOUT)
        .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String resolveRegion(String ip) {
        if (ip == null || ip.isBlank()) {
            return "访客";
        }
        String normalized = ip.trim();
        if (isPrivateOrLocal(normalized)) {
            return "本地访客";
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://ip-api.com/json/" + normalized + "?lang=zh-CN&fields=status,city,regionName,country"))
                .timeout(TIMEOUT)
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
                return fallbackLabel(normalized);
            }
            JsonNode node = objectMapper.readTree(response.body());
            if (!"success".equalsIgnoreCase(node.path("status").asText())) {
                return fallbackLabel(normalized);
            }
            String city = node.path("city").asText("").trim();
            String region = node.path("regionName").asText("").trim();
            if (!city.isBlank()) {
                return city;
            }
            if (!region.isBlank()) {
                return region;
            }
            String country = node.path("country").asText("").trim();
            return country.isBlank() ? fallbackLabel(normalized) : country;
        } catch (Exception ex) {
            log.debug("IP region lookup failed for {}: {}", normalized, ex.toString());
            return fallbackLabel(normalized);
        }
    }

    private static boolean isPrivateOrLocal(String ip) {
        if (ip.startsWith("127.")
            || "::1".equals(ip)
            || "localhost".equalsIgnoreCase(ip)
            || ip.startsWith("10.")
            || ip.startsWith("192.168.")) {
            return true;
        }
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }
        return false;
    }

    private static String fallbackLabel(String ip) {
        int lastDot = ip.lastIndexOf('.');
        if (lastDot > 0) {
            return "访客·" + ip.substring(0, lastDot) + ".*";
        }
        return "访客";
    }
}
