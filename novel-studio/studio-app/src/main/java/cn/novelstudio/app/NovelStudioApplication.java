package cn.novelstudio.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Novel Studio 单体入口 — 聚合 auth / content / agent / billing / worker。
 * <p>
 * 与 {@code novel-agent} 微服务完全独立：无 Nacos、无 Gateway 多进程、默认关闭客户端 AES/路由混淆。
 */
@SpringBootApplication(scanBasePackages = "cn.novelstudio")
@EnableScheduling
@EnableAsync
public class NovelStudioApplication {

    public static void main(String[] args) {
        SpringApplication.run(NovelStudioApplication.class, args);
    }
}
