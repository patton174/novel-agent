-- Auth service baseline (shared DB: novel_agent)
CREATE TABLE IF NOT EXISTS auth_user (
    id              BIGINT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    email           VARCHAR(100) NOT NULL,
    role            VARCHAR(20),
    permissions     VARCHAR(500),
    is_active       BOOLEAN,
    email_verified  BOOLEAN,
    created_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_auth_user_username ON auth_user (username);
CREATE UNIQUE INDEX IF NOT EXISTS uk_auth_user_email ON auth_user (email);
