package cn.novelstudio.platform.i18n;

import cn.novelstudio.kernel.base.Result;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/** 统一将 {@link Result} 的 msg 按请求 Locale 本地化。 */
@RestControllerAdvice
public class ResultI18nResponseAdvice implements ResponseBodyAdvice<Object> {

    private final ResultLocalizer resultLocalizer;

    public ResultI18nResponseAdvice(ResultLocalizer resultLocalizer) {
        this.resultLocalizer = resultLocalizer;
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return Result.class.isAssignableFrom(returnType.getParameterType());
    }

    @Override
    @SuppressWarnings("unchecked")
    public Object beforeBodyWrite(
        Object body,
        MethodParameter returnType,
        MediaType selectedContentType,
        Class<? extends HttpMessageConverter<?>> selectedConverterType,
        ServerHttpRequest request,
        ServerHttpResponse response
    ) {
        if (body instanceof Result<?> result) {
            return resultLocalizer.localize(result);
        }
        return body;
    }
}
