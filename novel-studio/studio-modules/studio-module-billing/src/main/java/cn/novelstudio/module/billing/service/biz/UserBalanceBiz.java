package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import cn.novelstudio.module.billing.repository.UserBalanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class UserBalanceBiz {

    private final UserBalanceRepository repo;

    @Transactional(readOnly = true)
    public long getBalance(Long userId) {
        return repo.findById(userId).map(UserBalanceEntity::getBalanceMicros).orElse(0L);
    }

    @Transactional
    public void credit(Long userId, long amountMicros) {
        if (repo.findById(userId).isEmpty()) {
            UserBalanceEntity b = new UserBalanceEntity();
            b.setUserId(userId);
            b.setBalanceMicros(amountMicros);
            repo.save(b);
        } else {
            repo.credit(userId, amountMicros);
        }
    }

    /** 扣减（赊账允许负）。返回扣后余额。 */
    @Transactional
    public long deduct(Long userId, long amountMicros) {
        if (repo.findById(userId).isEmpty()) {
            UserBalanceEntity b = new UserBalanceEntity();
            b.setUserId(userId);
            b.setBalanceMicros(-amountMicros);
            repo.save(b);
            return -amountMicros;
        }
        repo.deduct(userId, amountMicros);
        return repo.findById(userId).map(UserBalanceEntity::getBalanceMicros).orElse(0L);
    }

    @Transactional
    public void adjust(Long userId, long deltaMicros) {
        if (deltaMicros >= 0) {
            credit(userId, deltaMicros);
        } else {
            deduct(userId, -deltaMicros);
        }
    }
}
