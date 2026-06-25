package cn.novelstudio.module.billing.controller;

import cn.novelstudio.module.billing.service.biz.IDataRiverPaymentBiz;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/billing/webhook")
@RequiredArgsConstructor
public class BillingWebhookController {

    private static final Logger log = LoggerFactory.getLogger(BillingWebhookController.class);

    private final IDataRiverPaymentBiz paymentBiz;

    @PostMapping("/idatariver")
    public ResponseEntity<Void> idatariver(@RequestBody Map<String, Object> payload) {
        try {
            paymentBiz.handleWebhook(payload);
            return ResponseEntity.status(HttpStatus.OK).build();
        } catch (Exception ex) {
            log.warn("iDataRiver webhook failed: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}
