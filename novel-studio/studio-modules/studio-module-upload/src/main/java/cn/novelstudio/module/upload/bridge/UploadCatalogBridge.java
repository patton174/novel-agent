package cn.novelstudio.module.upload.bridge;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 上传解析结果 → 书库入库桥接。
 * 由 content 模块实现，upload 编排层不直接依赖 crawl catalog 实体。
 */
public interface UploadCatalogBridge {

    /** 是否已有该书库记录（幂等判断）。 */
    boolean catalogExists(String catalogNovelId);

    /**
     * 将 python 解析结果写入书库。
     *
     * @return 新建或已有的 catalog novel id
     */
    String importParsedUpload(String fileId, Long ownerId, String originalName, JsonNode result);
}
