package com.novel.agent.content.config;

import com.novel.agent.feign.auth.IFeignUserStats;
import org.springframework.cloud.openfeign.FeignClient;

@FeignClient(
    name = "agent-auth",
    path = "/internal/auth",
    contextId = "feignUserStats",
    configuration = FeignInternalClientConfig.class
)
public interface FeignUserStatsClient extends IFeignUserStats {
}
