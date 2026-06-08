package com.syncstudy.service;

import com.syncstudy.dto.request.LoginRequest;
import com.syncstudy.dto.request.RegisterRequest;
import com.syncstudy.dto.response.AuthResponse;
import com.syncstudy.dto.response.UserResponse;
import com.syncstudy.model.User;
import com.syncstudy.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;
    private final NotificationService notificationService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PasswordResetService passwordResetService,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
        this.notificationService = notificationService;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .school(user.getSchool())
                .level(user.getLevel())
                .phone(user.getPhone())
                .birthDate(user.getBirthDate())
                .avatarUrl(user.getAvatarUrl())
                .preferences(user.getPreferences())
                .onboardingCompleted(user.isOnboardingCompleted())
                .joinedDate(user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate().toString() : "")
                .build();
    }

    private AuthResponse tokenResponse(User user, String refreshToken) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getRole());
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(toUserResponse(user))
                .build();
    }

    // ── public API ───────────────────────────────────────────────────────────

    public AuthResponse register(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(BAD_REQUEST, "Email already exists");
        }
        User user = User.builder()
                .name(req.getName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .school(req.getSchool())
                .level(req.getLevel())
                .phone(req.getPhone())
                .birthDate(req.getBirthDate())
                .passwordHint(req.getPasswordHint() != null && !req.getPasswordHint().isBlank()
                        ? req.getPasswordHint().trim() : null)
                .onboardingCompleted(false)
                .createdAt(LocalDateTime.now())
                .refreshTokens(new ArrayList<>())
                .build();
        user = userRepository.save(user);

        // Notifier l'admin de la nouvelle inscription
        // Capturer dans des variables final pour la lambda
        final User savedUser      = user;
        final String savedEmail   = email;
        final String savedSchool  = savedUser.getSchool() != null && !savedUser.getSchool().isBlank() ? savedUser.getSchool() : "—";
        final String savedLevel   = savedUser.getLevel()  != null && !savedUser.getLevel().isBlank()  ? savedUser.getLevel()  : "—";
        userRepository.findByRole("admin").stream().findFirst().ifPresent(admin ->
            notificationService.push(admin.getId(),
                    "user_registered",
                    "Nouvelle inscription",
                    savedUser.getName() + " vient de créer un compte sur SyncStudy.",
                    "Nom : " + savedUser.getName() + "  ·  Email : " + savedEmail
                            + "  ·  École : " + savedSchool + "  ·  Niveau : " + savedLevel,
                    savedEmail
            )
        );

        String refreshToken = jwtService.generateRefreshToken(user.getId());
        user.getRefreshTokens().add(refreshToken);
        user = userRepository.save(user);
        return tokenResponse(user, refreshToken);
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid credentials");
        }
        if ("suspended".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(FORBIDDEN, "Account suspended");
        }

        user.setLastLogin(LocalDateTime.now());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        if (user.getRefreshTokens() == null) user.setRefreshTokens(new ArrayList<>());
        user.getRefreshTokens().add(refreshToken);
        user = userRepository.save(user);
        return tokenResponse(user, refreshToken);
    }

    public void logout(String refreshToken) {
        try {
            String userId = jwtService.extractUserId(refreshToken);
            userRepository.findById(userId).ifPresent(user -> {
                if (user.getRefreshTokens() != null) {
                    user.getRefreshTokens().remove(refreshToken);
                    userRepository.save(user);
                }
            });
        } catch (Exception ignored) {
            // best effort — token may already be invalid
        }
    }

    public AuthResponse refresh(String refreshToken) {
        if (!jwtService.isTokenValid(refreshToken)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token");
        }
        String userId = jwtService.extractUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token"));
        if (user.getRefreshTokens() == null || !user.getRefreshTokens().contains(refreshToken)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token");
        }
        return tokenResponse(user, refreshToken);
    }

    /**
     * Réinitialisation directe du mot de passe (sans lien email).
     * Vérifie que l'email existe, met à jour le hash et l'indice mémo.
     */
    public void resetPasswordDirect(String email, String newPassword, String hint) {
        String normalizedEmail = (email == null ? "" : email.trim().toLowerCase());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Aucun compte trouvé pour cet email"));
        if ("suspended".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(FORBIDDEN, "Account suspended");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(BAD_REQUEST, "Mot de passe trop court");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        if (hint != null && !hint.isBlank()) {
            user.setPasswordHint(hint.trim());
        }
        userRepository.save(user);
    }

    /**
     * Retourne l'indice mémo du mot de passe pour un email donné.
     * Renvoie une chaîne vide si l'utilisateur n'existe pas ou n'a pas d'indice,
     * afin de ne pas divulguer l'existence du compte.
     */
    public String getPasswordHint(String email) {
        if (email == null || email.isBlank()) return "";
        return userRepository.findByEmail(email.trim().toLowerCase())
                .map(user -> user.getPasswordHint() != null ? user.getPasswordHint() : "")
                .orElse("");
    }

    /** Envoie un email de réinitialisation (CDC §4.1.1). */
    public void forgotPassword(String email) {
        passwordResetService.requestReset(email);
    }

    /** Valide le token et met à jour le mot de passe (CDC §4.1.1). */
    public void resetPassword(String token, String newPassword) {
        passwordResetService.confirmReset(token, newPassword);
    }
}
