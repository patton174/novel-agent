package cn.novelstudio.module.content.dto;

import lombok.Data;

import java.util.List;

@Data
public class ReferencedBookDTO {
    private String catalogNovelId;
    private String title;
    /** = description */
    private String summary;
    private List<String> chapterTitles;
    /** library:<uid>:<id> | catalog:<id> */
    private String namespace;
    private String indexStatus;
}
