package cn.novelstudio.platform.security;

public class AuthUnauthorizedException extends RuntimeException {

    public AuthUnauthorizedException(String message) {
        super(message);
    }
}
