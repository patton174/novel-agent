package cn.novelstudio.platform.messaging.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;

/**
 * MQ 模块统一业务异常工厂。
 */
public final class MqExceptions {

    private MqExceptions() {}

    public static BizException sendFailed(String topicName) {
        return BizException.keyed(ResultCode.ERROR, "messaging.send_failed", topicName);
    }
}
