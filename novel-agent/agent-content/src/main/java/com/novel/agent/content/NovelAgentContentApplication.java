package com.novel.agent.content;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableFeignClients(basePackages = "com.novel.agent.content.config")
public class NovelAgentContentApplication {
    public static void main(String[] args) {
        SpringApplication.run(NovelAgentContentApplication.class, args);
    }
}
