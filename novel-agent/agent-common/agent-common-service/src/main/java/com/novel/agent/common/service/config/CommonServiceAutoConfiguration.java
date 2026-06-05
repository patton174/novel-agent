package com.novel.agent.common.service.config;

import com.novel.agent.common.service.HandlerException;
import com.novel.agent.common.service.internal.InternalServiceGuard;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@Import({HandlerException.class, InternalServiceGuard.class})
public class CommonServiceAutoConfiguration {
}
