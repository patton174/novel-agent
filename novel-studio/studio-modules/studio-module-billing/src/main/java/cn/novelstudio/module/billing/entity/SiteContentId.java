package cn.novelstudio.module.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
public class SiteContentId implements Serializable {

    @Column(name = "content_key", length = 64)
    private String contentKey;

    @Column(name = "locale", length = 8)
    private String locale;
}
