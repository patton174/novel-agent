package cn.novelstudio.module.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "user_balance")
@Getter
@Setter
public class UserBalanceEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "balance_micros", nullable = false)
    private Long balanceMicros = 0L;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
