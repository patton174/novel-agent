package cn.novelstudio.module.upload.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadFileDTO {
    private String fileId;
    private String status;
    private Integer progress;
    private String originalName;
    private Long sizeBytes;
    private String format;
    private String parseError;
    private String catalogNovelId;
    private Long createdAt;
}
