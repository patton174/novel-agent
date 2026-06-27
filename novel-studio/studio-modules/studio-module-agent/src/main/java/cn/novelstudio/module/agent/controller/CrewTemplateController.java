package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.service.biz.CrewTemplateBiz;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import cn.novelstudio.module.content.dto.agent.CreateCrewTemplateRequest;
import cn.novelstudio.module.content.dto.agent.CrewTemplateDTO;
import cn.novelstudio.module.content.dto.agent.UpdateCrewTemplateRequest;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/agent/crews")
public class CrewTemplateController extends BaseController {

    private final CrewTemplateBiz biz;

    public CrewTemplateController(CrewTemplateBiz biz) {
        this.biz = biz;
    }

    @GetMapping
    public Result<List<CrewTemplateDTO>> list(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader
    ) {
        return biz.list(parseUserId(userIdHeader));
    }

    @GetMapping("/{id}")
    public Result<CrewTemplateDTO> get(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String id
    ) {
        return biz.get(parseUserId(userIdHeader), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Result<CrewTemplateDTO> create(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @Valid @RequestBody CreateCrewTemplateRequest request
    ) {
        return biz.create(parseUserId(userIdHeader), request);
    }

    @PutMapping("/{id}")
    public Result<CrewTemplateDTO> update(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String id,
        @Valid @RequestBody UpdateCrewTemplateRequest request
    ) {
        return biz.update(parseUserId(userIdHeader), id, request);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String id
    ) {
        return biz.delete(parseUserId(userIdHeader), id);
    }
}
