package cn.novelstudio.module.content.client;

import cn.novelstudio.module.content.config.ContentRuntimeProperties;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;

/** 调用 python-ai {@code POST /internal/model/test} 做 LLM 连通性探测。 */
@Component
public class PythonModelTestClient {

    private final RestClient restClient;
    private final String internalKey;
    private final StudioMessages messages;
    private final ResultLocalizer resultLocalizer;

    public PythonModelTestClient(
        RestClient pythonRestClient,
        ContentRuntimeProperties props,
        StudioMessages messages,
        ResultLocalizer resultLocalizer
    ) {
        this.restClient = pythonRestClient;
        this.internalKey = props.internalServiceKey();
        this.messages = messages;
        this.resultLocalizer = resultLocalizer;
    }

    public Map<String, Object> test(Map<String, Object> config) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("config", config);
        try {
            Map<String, Object> resp = restClient.post()
                .uri("/internal/model/test")
                .header("X-Internal-Service-Key", internalKey)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
            return resp != null ? resp : Map.of("ok", false, "error", messages.get("model.python_test.empty_response"));
        } catch (RestClientResponseException ex) {
            return Map.of(
                "ok", false,
                "error", ex.getResponseBodyAsString() != null && !ex.getResponseBodyAsString().isBlank()
                    ? ex.getResponseBodyAsString()
                    : ("HTTP " + ex.getStatusCode().value())
            );
        } catch (Exception ex) {
            String error = ex.getMessage() == null || ex.getMessage().isBlank()
                ? messages.get("model.python_test.failed")
                : resultLocalizer.resolveLiteral(ex.getMessage());
            return Map.of("ok", false, "error", error);
        }
    }
}
