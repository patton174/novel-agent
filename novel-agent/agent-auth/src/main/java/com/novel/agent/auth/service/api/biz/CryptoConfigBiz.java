package com.novel.agent.auth.service.api.biz;

import com.novel.agent.auth.service.FrontendCryptoRegisterService;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CryptoConfigBiz extends BaseBiz {

    private final FrontendCryptoRegisterService frontendCryptoRegisterService;

    public Optional<FrontendCryptoRegisterService.CryptoRuntimeView> currentRuntime() {
        return frontendCryptoRegisterService.currentRuntime();
    }
}
