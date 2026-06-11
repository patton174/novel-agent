package cn.novelstudio.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Novel Studio 单体入口 — 聚合 auth / content / agent / billing / worker。
 * <p>
 * 与 {@code novel-agent} 微服务完全独立：无 Nacos、无 Gateway 多进程；
 * 生产 profile 启用 {@code auth.client-security} Servlet Filter 链（AES / 路由混淆 / Sign）。
 */
@SpringBootApplication
@ComponentScan(
    basePackages = "cn.novelstudio",
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = "cn\\.novelstudio\\.platform\\.web\\.clientsecurity\\..*"
    )
)
@EnableScheduling
@EnableAsync
public class NovelStudioApplication {

    public static void main(String[] args) {
        SpringApplication.run(NovelStudioApplication.class, args);
    }
}
