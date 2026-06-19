package cn.novelstudio.module.content.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 上传文件视图：含状态与解析进度（parsing 时进度来自 Redis）。 */
@Data
@AllArgsConstructor
public class UploadFileDTO {
    private String fileId;
    private String status;        // pending|parsing|ready|failed
    private Integer progress;     // 0-100（parsing 时来自 Redis；ready=100；pending=0）
    private String originalName;
    private Long sizeBytes;
    private String format;
    private String parseError;
    private String catalogNovelId;
    private Long createdAt;
}
