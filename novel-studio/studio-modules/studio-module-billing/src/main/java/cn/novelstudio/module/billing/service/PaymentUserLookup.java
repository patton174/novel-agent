package cn.novelstudio.module.billing.service;

/** Resolves iDataRiver order contact info to a local user id. Implemented in auth module at runtime. */
public interface PaymentUserLookup {

    long resolveUserId(String contactInfo);
}
