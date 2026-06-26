package cn.novelstudio.platform.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

public final class JwtCodec {

    private final byte[] secret;
    private final String issuer;
    private final long accessTtlSeconds;

    public JwtCodec(String secret, String issuer, long accessTtlSeconds) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("auth.jwt.secret_too_short");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.issuer = issuer == null || issuer.isBlank() ? "novel-agent" : issuer;
        this.accessTtlSeconds = accessTtlSeconds > 0 ? accessTtlSeconds : 3600;
    }

    public String issueAccessToken(
        Long userId,
        String sessionId,
        String username,
        List<String> roles
    ) {
        try {
            Instant now = Instant.now();
            String jti = UUID.randomUUID().toString();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject(String.valueOf(userId))
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(accessTtlSeconds)))
                .jwtID(jti)
                .claim("sid", sessionId)
                .claim("username", username)
                .claim("roles", roles == null ? List.of() : roles)
                .build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret));
            return jwt.serialize();
        } catch (Exception ex) {
            throw new IllegalStateException("auth.jwt.issue_failed", ex);
        }
    }

    public JwtPrincipal parseAccessToken(String token) {
        if (token == null || token.isBlank()) {
            throw new AuthUnauthorizedException("result.unauthorized");
        }
        String normalized = token.trim();
        if (normalized.regionMatches(true, 0, "Bearer ", 0, 7)) {
            normalized = normalized.substring(7).trim();
        }
        try {
            SignedJWT jwt = SignedJWT.parse(normalized);
            if (!jwt.verify(new MACVerifier(secret))) {
                throw new AuthUnauthorizedException("result.auth.token_expired");
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            Date exp = claims.getExpirationTime();
            if (exp != null && exp.before(new Date())) {
                throw new AuthUnauthorizedException("result.auth.token_expired");
            }
            String issuerClaim = claims.getIssuer();
            if (issuerClaim != null && !issuer.equals(issuerClaim)) {
                throw new AuthUnauthorizedException("result.auth.token_expired");
            }
            Long userId = Long.parseLong(claims.getSubject());
            String sid = claims.getStringClaim("sid");
            String username = claims.getStringClaim("username");
            @SuppressWarnings("unchecked")
            List<String> roles = claims.getClaim("roles") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of();
            return new JwtPrincipal(userId, sid, username, roles, claims.getJWTID());
        } catch (AuthUnauthorizedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AuthUnauthorizedException("result.auth.token_expired");
        }
    }

    public long accessTtlSeconds() {
        return accessTtlSeconds;
    }
}
