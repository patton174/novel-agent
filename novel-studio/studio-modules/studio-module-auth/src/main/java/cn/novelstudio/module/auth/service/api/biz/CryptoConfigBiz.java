package cn.novelstudio.module.auth.service.api.biz;

import cn.novelstudio.module.auth.service.FrontendCryptoRegisterService;
import cn.novelstudio.kernel.biz.BaseBiz;
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
