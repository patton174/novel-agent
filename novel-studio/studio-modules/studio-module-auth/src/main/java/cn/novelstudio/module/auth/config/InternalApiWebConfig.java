package cn.novelstudio.module.auth.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class InternalApiWebConfig implements WebMvcConfigurer {

    private final InternalServiceKeyInterceptor internalServiceKeyInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(internalServiceKeyInterceptor)
            .addPathPatterns("/internal/**");
    }
}
