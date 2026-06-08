package com.syncstudy.dto.response;

import com.syncstudy.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private String id;
    private String name;
    private String email;
    private String role;
    private String status;
    private String school;
    private String level;
    private String phone;
    private String birthDate;
    private String avatarUrl;
    private User.UserPreferences preferences;
    private boolean onboardingCompleted;
    private String joinedDate;

    // Explicit getters/setters for IDEs where Lombok isn't processed reliably.
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    public User.UserPreferences getPreferences() { return preferences; }
    public void setPreferences(User.UserPreferences preferences) { this.preferences = preferences; }

    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public String getJoinedDate() { return joinedDate; }
    public void setJoinedDate(String joinedDate) { this.joinedDate = joinedDate; }
}
