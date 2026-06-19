package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * 我的书库收藏关系（user × 公共/上传书库条目）。
 * 轻引用：仅记录收藏关系，不复制作品数据。
 */
@Entity
@Table(name = "user_library_collection")
@IdClass(UserLibraryCollectionEntity.PK.class)
@Getter
@Setter
public class UserLibraryCollectionEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "catalog_novel_id", nullable = false, length = 36)
    private String catalogNovelId;

    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt;

    @PrePersist
    void onCreate() {
        if (collectedAt == null) {
            collectedAt = Instant.now();
        }
    }

    /** 复合主键。 */
    public static class PK implements Serializable {
        private Long userId;
        private String catalogNovelId;

        public PK() {
        }

        public PK(Long userId, String catalogNovelId) {
            this.userId = userId;
            this.catalogNovelId = catalogNovelId;
        }

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public String getCatalogNovelId() {
            return catalogNovelId;
        }

        public void setCatalogNovelId(String catalogNovelId) {
            this.catalogNovelId = catalogNovelId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(userId, pk.userId) && Objects.equals(catalogNovelId, pk.catalogNovelId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, catalogNovelId);
        }
    }
}
