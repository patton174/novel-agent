package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface UserBalanceRepository extends JpaRepository<UserBalanceEntity, Long> {

    /** 原子扣减（允许负值赊账）。返回受影响行数。 */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserBalanceEntity b SET b.balanceMicros = b.balanceMicros - :cost WHERE b.userId = :userId")
    int deduct(Long userId, Long cost);

    /** 原子充值。 */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserBalanceEntity b SET b.balanceMicros = b.balanceMicros + :amount WHERE b.userId = :userId")
    int credit(Long userId, Long amount);
}
