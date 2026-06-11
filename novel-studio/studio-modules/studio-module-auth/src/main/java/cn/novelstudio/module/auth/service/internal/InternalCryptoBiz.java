package cn.novelstudio.module.auth.service.internal;

import cn.novelstudio.module.auth.service.CryptoManifestService;
import cn.novelstudio.module.auth.service.FrontendCryptoRegisterService;
import cn.novelstudio.kernel.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * internal crypto API。鉴权由 {@link cn.novelstudio.module.auth.config.InternalServiceKeyInterceptor} 统一处理。
 */
@Component
@RequiredArgsConstructor
public class InternalCryptoBiz extends BaseBiz {

    private final CryptoManifestService cryptoManifestService;
    private final FrontendCryptoRegisterService frontendCryptoRegisterService;

    public void publishManifest(CryptoManifestService.CryptoManifestView manifest, long ttlSec) {
        cryptoManifestService.publish(manifest, ttlSec);
    }

    public FrontendCryptoRegisterService.CryptoRuntimeView registerFrontendServer(
        String host,
        long ttlSec,
        CryptoManifestService.CryptoManifestView manifest
    ) {
        if (manifest != null) {
            cryptoManifestService.publish(manifest, ttlSec);
        }
        return frontendCryptoRegisterService.registerFromFrontendServer(host, ttlSec);
    }
}
