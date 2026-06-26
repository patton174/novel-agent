package cn.novelstudio.module.content;

import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.math.BigDecimal;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ModelBootstrap {

    private final AiModelRepository repo;
    private final ModelKeyCodec keyCodec;
    private final StudioMessages messages;

    @Bean
    ApplicationRunner bootstrapModels(Environment env) {
        return args -> {
            if (repo.count() > 0) {
                return;
            }
            log.info("ai_model 表为空，从 env 引导默认模型");
            seed("llm", "platform-llm", messages.get("model.bootstrap.platform_llm"), "openai",
                env.getProperty("LLM_PROTOCOL", "openai"),
                env.getProperty("OPENAI_MODEL", "deepseek-chat"),
                env.getProperty("OPENAI_BASE_URL", ""),
                env.getProperty("OPENAI_API_KEY", ""));
            seed("crawl", "platform-crawl", messages.get("model.bootstrap.platform_crawl"), "openai", "openai",
                env.getProperty("CRAWL_LLM_MODEL", "agnes-2.0-flash"),
                env.getProperty("CRAWL_LLM_BASE_URL", ""),
                env.getProperty("CRAWL_LLM_API_KEY", ""));
            seed("embedding", "platform-embed", messages.get("model.bootstrap.platform_embedding"), "openai", "openai",
                env.getProperty("RAG_EMBED_MODEL", "text-embedding-3-small"),
                env.getProperty("RAG_EMBED_BASE_URL", ""),
                env.getProperty("RAG_EMBED_API_KEY", ""));
            seed("image", "platform-image", messages.get("model.bootstrap.platform_image"), "agnes", "openai",
                env.getProperty("AGNES_IMAGE_MODEL", "agnes-image-2.0-flash"),
                env.getProperty("AGNES_IMAGE_BASE_URL", ""),
                env.getProperty("AGNES_IMAGE_API_KEY", ""));
        };
    }

    private void seed(
        String type,
        String code,
        String name,
        String provider,
        String protocol,
        String model,
        String baseUrl,
        String apiKey
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("跳过引导 type={} code={}：对应 API key 未配置", type, code);
            return;
        }
        AiModelEntity e = new AiModelEntity();
        e.setCode(code);
        e.setDisplayName(name);
        e.setModelType(type);
        e.setProvider(provider);
        e.setProtocol(protocol);
        e.setModelName(model);
        e.setBaseUrl(baseUrl != null ? baseUrl : "");
        e.setApiKeyEnc(keyCodec.encrypt(apiKey));
        e.setPriceMultiplier(BigDecimal.ONE);
        e.setActive(true);
        e.setIsDefault(true);
        repo.save(e);
        log.info("引导默认模型 type={} code={}", type, code);
    }
}
