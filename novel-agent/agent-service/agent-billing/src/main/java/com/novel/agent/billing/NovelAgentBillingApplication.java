package com.novel.agent.billing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NovelAgentBillingApplication {

    public static void main(String[] args) {
        SpringApplication.run(NovelAgentBillingApplication.class, args);
    }
}
