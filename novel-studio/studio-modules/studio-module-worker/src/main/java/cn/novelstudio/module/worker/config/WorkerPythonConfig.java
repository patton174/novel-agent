package cn.novelstudio.module.worker.config;

import cn.novelstudio.platform.web.http.PythonRestClientSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class WorkerPythonConfig {

    @Bean
    RestClient pythonRestClient(@Value("${agent.python.base-url:http://127.0.0.1:8000}") String pythonBaseUrl) {
        return PythonRestClientSupport.create(pythonBaseUrl);
    }
}
