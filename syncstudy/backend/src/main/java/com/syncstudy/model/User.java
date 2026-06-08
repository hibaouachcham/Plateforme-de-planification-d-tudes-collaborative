package com.syncstudy.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    private String id;

    @NotBlank
    private String name;

    @Indexed(unique = true)
    @Email
    private String email;

    @NotBlank
    private String passwordHash;

    @Builder.Default
    private String role = "student";

    @Builder.Default
    private String status = "active";

    private String school;
    private String level;
    private String phone;
    private String birthDate;
    private String avatarUrl;
    private String passwordHint;
    private UserPreferences preferences;

    @Builder.Default
    private boolean onboardingCompleted = false;

    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;

    @Builder.Default
    private List<String> refreshTokens = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserPreferences {
        @Builder.Default
        private Integer preferredSessionMinutes = 45;

        @Builder.Default
        private List<Integer> restDayIndices = new ArrayList<>();

        /**
         * Si null ou true → rappels activés (comportement par défaut pour les anciens comptes).
         * Si false explicitement → rappels désactivés.
         * Utiliser Boolean (boxed) pour que Jackson laisse null quand le champ est absent en base.
         */
        private Boolean pushNotifications;

        public boolean isPushNotifications() {
            return pushNotifications == null || pushNotifications; // null = true par défaut
        }
        public void setPushNotifications(Boolean pushNotifications) { this.pushNotifications = pushNotifications; }
    }

    // Explicit getters/setters for IDEs where Lombok isn't processed reliably.
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSchool() { return school; }
    public void setSchool(String school) { this.school = school; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getPasswordHint() { return passwordHint; }
    public void setPasswordHint(String passwordHint) { this.passwordHint = passwordHint; }

    public UserPreferences getPreferences() { return preferences; }
    public void setPreferences(UserPreferences preferences) { this.preferences = preferences; }

    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; }

    public List<String> getRefreshTokens() { return refreshTokens; }
    public void setRefreshTokens(List<String> refreshTokens) { this.refreshTokens = refreshTokens; }
}
