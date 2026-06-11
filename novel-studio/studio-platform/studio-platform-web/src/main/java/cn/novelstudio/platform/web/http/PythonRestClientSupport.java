package cn.novelstudio.platform.web.http;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * 构建访问 python-ai (uvicorn) 的 RestClient。
 * uvicorn 对 HTTP/2 upgrade / Expect:100-continue 支持不完整，默认客户端会导致 POST body 丢失 → FastAPI 422。
 */
public final class PythonRestClientSupport {

    private PythonRestClientSupport() {}

    public static RestClient create(String pythonBaseUrl) {
        String baseUrl = pythonBaseUrl.replaceAll("/+$", "");
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
        return RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(new JdkClientHttpRequestFactory(httpClient))
            .build();
    }
}
