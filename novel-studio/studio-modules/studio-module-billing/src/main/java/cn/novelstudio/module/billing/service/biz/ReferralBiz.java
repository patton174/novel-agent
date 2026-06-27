package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.billing.dto.UserReferralConversionItem;
import cn.novelstudio.module.billing.dto.UserReferralConversionsResp;
import cn.novelstudio.module.billing.dto.UserReferralResp;
import cn.novelstudio.module.billing.entity.ReferralAttributionEntity;
import cn.novelstudio.module.billing.entity.ReferralCodeEntity;
import cn.novelstudio.module.billing.repository.ReferralAttributionRepository;
import cn.novelstudio.module.billing.repository.ReferralCodeRepository;
import cn.novelstudio.module.billing.support.ReferralConstants;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ReferralBiz extends BaseBiz {

    private static final Logger log = LoggerFactory.getLogger(ReferralBiz.class);
    private static final int CODE_LENGTH = 10;
    private static final String CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ReferralCodeRepository referralCodeRepository;
    private final ReferralAttributionRepository referralAttributionRepository;

    public Result<UserReferralResp> getUserReferral(long userId) {
        ReferralCodeEntity codeEntity = ensureReferralCode(userId);
        long referralCount = referralAttributionRepository.countByReferrerUserId(userId);
        long paidCount = referralAttributionRepository.countByReferrerUserIdAndFirstPaidOrderIdIsNotNull(userId);
        return ok(new UserReferralResp(codeEntity.getCode(), null, referralCount, paidCount));
    }

    public Result<UserReferralConversionsResp> listConversions(long userId) {
        List<ReferralAttributionEntity> rows =
            referralAttributionRepository.findByReferrerUserIdOrderByRegisteredAtDesc(userId);
        List<UserReferralConversionItem> items = new ArrayList<>(rows.size());
        for (ReferralAttributionEntity row : rows) {
            items.add(new UserReferralConversionItem(
                row.getId(),
                maskReferredUserLabel(row.getReferredUserId()),
                row.getRegisteredAt(),
                row.getFirstPaidOrderId() != null
            ));
        }
        return ok(new UserReferralConversionsResp(items));
    }

    static String maskReferredUserLabel(long referredUserId) {
        String raw = String.valueOf(referredUserId);
        if (raw.length() <= 4) {
            return raw;
        }
        return "***" + raw.substring(raw.length() - 4);
    }

    @Transactional
    public ReferralCodeEntity ensureReferralCode(long userId) {
        Optional<ReferralCodeEntity> existing = referralCodeRepository.findByUserId(userId);
        if (existing.isPresent()) {
            return existing.get();
        }
        ReferralCodeEntity entity = new ReferralCodeEntity();
        entity.setUserId(userId);
        entity.setCode(generateUniqueCode());
        entity.setStatus(ReferralConstants.STATUS_ACTIVE);
        return referralCodeRepository.save(entity);
    }

    public Optional<ReferralCodeEntity> findActiveByCode(String rawCode) {
        String code = normalizeCode(rawCode);
        if (code == null) {
            return Optional.empty();
        }
        return referralCodeRepository.findByCodeIgnoreCase(code)
            .filter(rc -> ReferralConstants.STATUS_ACTIVE.equalsIgnoreCase(rc.getStatus()));
    }

    @Transactional
    public void recordRegistrationAttribution(long referredUserId, String rawReferralCode) {
        String code = normalizeCode(rawReferralCode);
        if (code == null) {
            return;
        }
        if (referralAttributionRepository.findByReferredUserId(referredUserId).isPresent()) {
            return;
        }
        Optional<ReferralCodeEntity> referralCode = findActiveByCode(code);
        if (referralCode.isEmpty()) {
            log.debug("referral code not found or inactive: {}", code);
            return;
        }
        long referrerUserId = referralCode.get().getUserId();
        if (referrerUserId == referredUserId) {
            log.debug("skip self-referral for user {}", referredUserId);
            return;
        }
        Instant now = Instant.now();
        ReferralAttributionEntity attribution = new ReferralAttributionEntity();
        attribution.setReferrerUserId(referrerUserId);
        attribution.setReferredUserId(referredUserId);
        attribution.setFirstTouchAt(now);
        attribution.setRegisteredAt(now);
        referralAttributionRepository.save(attribution);
        log.info("referral attribution recorded referrer={} referred={} code={}", referrerUserId, referredUserId, code);
    }

    @Transactional
    public void recordFirstPaidOrder(long userId, long paymentOrderId) {
        referralAttributionRepository.findByReferredUserId(userId).ifPresent(attribution -> {
            if (attribution.getFirstPaidOrderId() != null) {
                return;
            }
            attribution.setFirstPaidOrderId(paymentOrderId);
            referralAttributionRepository.save(attribution);
            log.info(
                "referral first paid order recorded referrer={} referred={} orderId={}",
                attribution.getReferrerUserId(),
                userId,
                paymentOrderId
            );
        });
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = randomCode();
            if (!referralCodeRepository.existsByCodeIgnoreCase(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("failed to generate unique referral code");
    }

    private static String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    static String normalizeCode(String rawCode) {
        if (rawCode == null) {
            return null;
        }
        String trimmed = rawCode.trim();
        if (trimmed.isEmpty() || trimmed.length() > 32) {
            return null;
        }
        return trimmed.toLowerCase(Locale.ROOT);
    }
}
