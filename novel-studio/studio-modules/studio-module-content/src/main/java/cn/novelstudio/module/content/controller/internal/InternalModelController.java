package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.service.model.AiModelService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/internal/model")
@RequiredArgsConstructor
public class InternalModelController {

    private final AiModelRepository aiModelRepo;
    private final AiModelService aiModelService;

    @GetMapping("/active")
    public Result<Map<String, Object>> active(
        @RequestParam("type") String type,
        @RequestParam(value = "default", required = false) String def
    ) {
        AiModelEntity entity;
        if ("true".equalsIgnoreCase(def)) {
            entity = aiModelRepo.findFirstByModelTypeAndIsDefaultTrueAndActiveTrue(type).orElse(null);
        } else {
            entity = aiModelRepo.findFirstByModelTypeAndActiveTrueOrderBySortOrderAsc(type).orElse(null);
        }
        if (entity == null) {
            throw new NotFoundException("no model for type=" + type);
        }
        return Result.ok(aiModelService.toActiveConfig(entity));
    }
}
