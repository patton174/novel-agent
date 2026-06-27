package cn.novelstudio.module.billing.support;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RedemptionCodeGeneratorTest {

    @Test
    void generate_producesRequestedLength() {
        RedemptionCodeGenerator generator = new RedemptionCodeGenerator();
        assertThat(generator.generate(24)).hasSize(24);
    }

    @Test
    void generate_usesSafeAlphabet() {
        RedemptionCodeGenerator generator = new RedemptionCodeGenerator();
        Set<Character> allowed = Set.of(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            '2', '3', '4', '5', '6', '7', '8', '9'
        );
        for (int i = 0; i < 20; i++) {
            for (char ch : generator.generate(24).toCharArray()) {
                assertThat(allowed).contains(ch);
            }
        }
    }
}
