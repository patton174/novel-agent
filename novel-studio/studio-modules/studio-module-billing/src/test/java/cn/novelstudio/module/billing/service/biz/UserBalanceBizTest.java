package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import cn.novelstudio.module.billing.repository.UserBalanceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserBalanceBizTest {

    @Mock
    UserBalanceRepository repo;

    @InjectMocks
    UserBalanceBiz biz;

    @Test
    void getBalance_returnsZeroForNewUser() {
        when(repo.findById(10L)).thenReturn(Optional.empty());
        assertThat(biz.getBalance(10L)).isEqualTo(0L);
    }

    @Test
    void credit_initsAndCredits() {
        when(repo.findById(10L)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        biz.credit(10L, 5000L);
        verify(repo).save(argThat(b -> b.getBalanceMicros() == 5000L));
    }

    @Test
    void credit_existingIncrements() {
        UserBalanceEntity balance = new UserBalanceEntity();
        balance.setUserId(10L);
        balance.setBalanceMicros(1000L);
        when(repo.findById(10L)).thenReturn(Optional.of(balance));
        biz.credit(10L, 500L);
        verify(repo).credit(10L, 500L);
    }
}
