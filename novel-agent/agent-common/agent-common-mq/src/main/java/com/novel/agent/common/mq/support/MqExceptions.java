package com.novel.agent.common.mq.support;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;

/**
 * MQ 模块统一业务异常工厂。
 */
public final class MqExceptions {

    private MqExceptions() {}

    public static BizException sendFailed(String topicName) {
        return BizException.of(ResultCode.ERROR, "发送 MQ 消息失败: " + topicName);
    }
}
