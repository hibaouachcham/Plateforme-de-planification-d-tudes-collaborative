package com.syncstudy.dto.request;

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
public class UpdateProfileRequest {
    private String name;
    private String email;
    private String school;
    private String level;
    private String phone;
    private String birthDate;
    private User.UserPreferences preferences;
    private Boolean onboardingCompleted;

    // Explicit getters/setters for IDEs where Lombok isn't processed reliably.
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSchool() { return school; }
    public void setSchool(String school) { this.school = school; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }

    public User.UserPreferences getPreferences() { return preferences; }
    public void setPreferences(User.UserPreferences preferences) { this.preferences = preferences; }

    public Boolean getOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(Boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }
}
