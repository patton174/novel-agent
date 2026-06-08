package com.novel.agent.pyai.controller.internal;

import com.novel.agent.pyai.client.BillingInternalClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/internal/billing")
public class InternalBillingController {

    private final BillingInternalClient billingInternalClient;

    public InternalBillingController(BillingInternalClient billingInternalClient) {
        this.billingInternalClient = billingInternalClient;
    }

    @PostMapping("/usage/report")
    public Mono<Void> reportUsage(@RequestBody Map<String, Object> body) {
        return Mono.fromRunnable(() -> billingInternalClient.publishUsageReport(body));
    }
}
