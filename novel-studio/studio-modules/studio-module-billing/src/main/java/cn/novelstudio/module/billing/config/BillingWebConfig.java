package cn.novelstudio.module.billing.config;

import cn.novelstudio.module.billing.support.InternalServiceKeyInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class BillingWebConfig implements WebMvcConfigurer {

    private final InternalServiceKeyInterceptor internalServiceKeyInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalServiceKeyInterceptor)
            .addPathPatterns("/internal/billing/**");
    }
}
