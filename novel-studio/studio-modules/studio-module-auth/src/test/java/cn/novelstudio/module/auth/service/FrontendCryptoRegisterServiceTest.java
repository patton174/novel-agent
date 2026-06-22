package cn.novelstudio.module.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FrontendCryptoRegisterServiceTest {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void cryptoRuntimeViewJsonOmitsEmailLinkSecret() throws Exception {
    var view =
        new FrontendCryptoRegisterService.CryptoRuntimeView(
            "bf_testkid",
            "dGVzdA==",
            1782112522L,
            1782198922000L,
            "g/6ef4ac1a",
            "worker");

    String json = objectMapper.writeValueAsString(view);

    assertTrue(json.contains("keyId"));
    assertTrue(json.contains("aesKeyB64"));
    assertFalse(json.contains("emailLinkSecret"));
  }
}
