package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.kernel.base.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/internal/alert")
@Slf4j
public class InternalAlertController {

    @PostMapping("/model")
    public Result<Void> modelAlert(@RequestBody Map<String, Object> body) {
        log.warn("model alert: {}", body);
        return Result.ok();
    }
}
