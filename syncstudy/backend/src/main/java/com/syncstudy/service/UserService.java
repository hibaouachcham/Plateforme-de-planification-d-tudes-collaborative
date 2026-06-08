package com.syncstudy.service;

import com.syncstudy.dto.request.ChangePasswordRequest;
import com.syncstudy.dto.request.UpdateProfileRequest;
import com.syncstudy.dto.response.UserResponse;
import com.syncstudy.model.User;
import com.syncstudy.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private User mustFind(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
    }

    private UserResponse toResponse(User user) {
        UserResponse r = new UserResponse();
        r.setId(user.getId());
        r.setName(user.getName());
        r.setEmail(user.getEmail());
        r.setRole(user.getRole());
        r.setStatus(user.getStatus());
        r.setSchool(user.getSchool());
        r.setLevel(user.getLevel());
        r.setPhone(user.getPhone());
        r.setBirthDate(user.getBirthDate());
        r.setAvatarUrl(user.getAvatarUrl());
        r.setPreferences(user.getPreferences());
        r.setOnboardingCompleted(user.isOnboardingCompleted());
        r.setJoinedDate(user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate().toString() : "");
        return r;
    }

    public UserResponse getProfile(String userId) {
        return toResponse(mustFind(userId));
    }

    public UserResponse updateProfile(String userId, UpdateProfileRequest req) {
        User user = mustFind(userId);
        if (req.getName() != null) user.setName(req.getName());
        if (req.getEmail() != null) {
            String email = req.getEmail().trim().toLowerCase();
            if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(email)) {
                throw new ResponseStatusException(BAD_REQUEST, "Email already exists");
            }
            user.setEmail(email);
        }
        if (req.getSchool() != null) user.setSchool(req.getSchool());
        if (req.getLevel() != null) user.setLevel(req.getLevel());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getBirthDate() != null) user.setBirthDate(req.getBirthDate());
        if (req.getPreferences() != null) user.setPreferences(req.getPreferences());
        if (req.getOnboardingCompleted() != null) user.setOnboardingCompleted(req.getOnboardingCompleted());
        return toResponse(userRepository.save(user));
    }

    public void changePassword(String userId, ChangePasswordRequest req) {
        User user = mustFind(userId);
        if (!passwordEncoder.matches(req.oldPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(BAD_REQUEST, "Old password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword));
        userRepository.save(user);
    }
}
