package cn.novelstudio.module.auth.service.billing;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.module.billing.service.PaymentUserLookup;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class AuthPaymentUserLookup implements PaymentUserLookup {

    private final AuthUserRepository authUserRepository;

    @Override
    public long resolveUserId(String contactInfo) {
        if (contactInfo == null || contactInfo.isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.webhook.contact_required");
        }
        String contact = contactInfo.trim();
        if (contact.startsWith("na-u-")) {
            try {
                return Long.parseLong(contact.substring(5).trim());
            } catch (NumberFormatException ex) {
                throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.webhook.invalid_contact");
            }
        }
        String email = contact.toLowerCase(Locale.ROOT);
        return authUserRepository.findByEmail(email)
            .map(AuthUser::getId)
            .orElseThrow(() -> ValidationException.keyed(
                ResultCode.NOT_FOUND,
                "payment.webhook.user_not_found",
                contact
            ));
    }
}
