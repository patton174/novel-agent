package cn.novelstudio.module.auth.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Data
@Entity
@Table(name = "auth_user")
public class AuthUser {

    @Id
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 20)
    private String role = "user";  // user, vip, admin

    @Column(length = 500)
    private String permissions;  // JSON格式存储权限列表

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    /** JSON：pixelAvatar 等 UI 偏好 */
    @Column(name = "ui_prefs", columnDefinition = "TEXT")
    private String uiPrefs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}