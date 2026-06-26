package cn.novelstudio.platform.idr;

/** iDataRiver 连接凭证（由 billing 配置层提供）。 */
public interface IDataRiverConnection {

    boolean isConfigured();

    String getBaseUrl();

    String getMerchantSecret();

    String getLocale();
}
