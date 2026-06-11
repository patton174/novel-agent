package cn.novelstudio.app.config;

import cn.novelstudio.platform.web.http.PythonRestClientSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/** 单体仅保留对外部 Python AI 的 HTTP 客户端。 */
@Configuration
public class StudioPythonClientConfig {

    @Bean
    RestClient pythonRestClient(@Value("${agent.python.base-url:http://127.0.0.1:8000}") String baseUrl) {
        return PythonRestClientSupport.create(baseUrl);
    }
}
