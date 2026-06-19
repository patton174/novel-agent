package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UploadedFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 上传文件仓储。本 worktree 为最小桩，扩展查询由 Part 1 提供。
 */
public interface UploadedFileRepository extends JpaRepository<UploadedFileEntity, String> {
}
