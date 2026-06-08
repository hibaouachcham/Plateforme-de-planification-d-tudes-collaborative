package com.syncstudy.service;

import com.syncstudy.dto.request.LoginRequest;
import com.syncstudy.dto.request.RegisterRequest;
import com.syncstudy.dto.response.AuthResponse;
import com.syncstudy.model.User;
import com.syncstudy.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

/**
 * Tests unitaires pour {@link AuthService}.
 *
 * Chaque test vérifie un seul comportement métier ;
 * toutes les dépendances sont mockées avec Mockito.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository       userRepository;
    @Mock private PasswordEncoder      passwordEncoder;
    @Mock private JwtService           jwtService;
    @Mock private PasswordResetService passwordResetService;
    @Mock private NotificationService  notificationService;

    @InjectMocks
    private AuthService service;

    // ── Fixtures ──────────────────────────────────────────────────────────────

    private RegisterRequest registerRequest() {
        return RegisterRequest.builder()
                .name("Alice Martin")
                .email("alice@example.com")
                .password("SecurePass1")
                .school("ENSA Marrakech")
                .level("Licence 3")
                .build();
    }

    private User savedUser() {
        return User.builder()
                .id("user-alice")
                .name("Alice Martin")
                .email("alice@example.com")
                .passwordHash("$2a$encoded")
                .role("student")
                .status("active")
                .school("ENSA Marrakech")
                .level("Licence 3")
                .refreshTokens(new ArrayList<>())
                .build();
    }

    // ── register() ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("register()")
    class Register {

        @Test
        @DisplayName("Inscription réussie → retourne tokens + user, notifie l'admin")
        void success_returnsTokensAndNotifiesAdmin() {
            RegisterRequest req = registerRequest();

            when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$encoded");
            when(userRepository.save(any(User.class))).thenReturn(savedUser());
            when(jwtService.generateRefreshToken("user-alice")).thenReturn("refresh-token");
            when(jwtService.generateAccessToken("user-alice", "student")).thenReturn("access-token");

            // Simuler un admin trouvé
            User admin = User.builder().id("admin-id").role("admin").build();
            when(userRepository.findByRole("admin")).thenReturn(List.of(admin));

            AuthResponse response = service.register(req);

            assertThat(response.getAccessToken()).isEqualTo("access-token");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
            assertThat(response.getUser().getEmail()).isEqualTo("alice@example.com");

            // L'admin doit recevoir une notification user_registered
            verify(notificationService).push(
                    eq("admin-id"),
                    eq("user_registered"),
                    anyString(),
                    anyString(),
                    anyString(),
                    eq("alice@example.com")
            );
        }

        @Test
        @DisplayName("Email déjà existant → lève BAD_REQUEST")
        void duplicateEmail_throwsBadRequest() {
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

            assertThatThrownBy(() -> service.register(registerRequest()))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(BAD_REQUEST));

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Aucun admin présent → inscription réussie sans envoi de notification")
        void noAdmin_registerSucceedsWithoutNotification() {
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$encoded");
            when(userRepository.save(any(User.class))).thenReturn(savedUser());
            when(jwtService.generateRefreshToken("user-alice")).thenReturn("refresh-token");
            when(jwtService.generateAccessToken("user-alice", "student")).thenReturn("access-token");
            when(userRepository.findByRole("admin")).thenReturn(List.of()); // pas d'admin

            AuthResponse response = service.register(registerRequest());

            assertThat(response).isNotNull();
            verify(notificationService, never()).push(anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("L'email est normalisé en minuscules avant sauvegarde")
        void emailNormalized_toLowercase() {
            RegisterRequest req = RegisterRequest.builder()
                    .name("Bob")
                    .email("BOB@EXAMPLE.COM")
                    .password("password123")
                    .build();

            when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("hashed");

            User bobSaved = User.builder()
                    .id("bob-id").name("Bob").email("bob@example.com")
                    .passwordHash("hashed").role("student").status("active")
                    .refreshTokens(new ArrayList<>())
                    .build();
            when(userRepository.save(any())).thenReturn(bobSaved);
            when(jwtService.generateRefreshToken("bob-id")).thenReturn("rt");
            when(jwtService.generateAccessToken("bob-id", "student")).thenReturn("at");
            when(userRepository.findByRole("admin")).thenReturn(List.of());

            service.register(req);

            // register() appelle save() deux fois : une première fois pour créer le compte,
            // une seconde fois pour persister le refreshToken → on vérifie le premier appel.
            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository, org.mockito.Mockito.times(2)).save(captor.capture());
            assertThat(captor.getAllValues().get(0).getEmail()).isEqualTo("bob@example.com");
        }
    }

    // ── login() ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("login()")
    class Login {

        private LoginRequest loginRequest() {
            return LoginRequest.builder()
                    .email("alice@example.com")
                    .password("SecurePass1")
                    .build();
        }

        @Test
        @DisplayName("Connexion réussie → retourne access + refresh tokens")
        void success_returnsTokens() {
            User user = savedUser();
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("SecurePass1", "$2a$encoded")).thenReturn(true);
            when(jwtService.generateRefreshToken("user-alice")).thenReturn("refresh-token");
            when(jwtService.generateAccessToken("user-alice", "student")).thenReturn("access-token");
            when(userRepository.save(any())).thenReturn(user);

            AuthResponse response = service.login(loginRequest());

            assertThat(response.getAccessToken()).isEqualTo("access-token");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        }

        @Test
        @DisplayName("Email introuvable → lève UNAUTHORIZED")
        void emailNotFound_throwsUnauthorized() {
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.login(loginRequest()))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(UNAUTHORIZED));
        }

        @Test
        @DisplayName("Mauvais mot de passe → lève UNAUTHORIZED")
        void wrongPassword_throwsUnauthorized() {
            User user = savedUser();
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("SecurePass1", "$2a$encoded")).thenReturn(false);

            assertThatThrownBy(() -> service.login(loginRequest()))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(UNAUTHORIZED));
        }

        @Test
        @DisplayName("Compte suspendu → lève FORBIDDEN")
        void suspendedAccount_throwsForbidden() {
            User user = savedUser();
            user.setStatus("suspended");
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("SecurePass1", "$2a$encoded")).thenReturn(true);

            assertThatThrownBy(() -> service.login(loginRequest()))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(FORBIDDEN));
        }

        @Test
        @DisplayName("Connexion réussie → lastLogin est mis à jour")
        void success_updatesLastLogin() {
            User user = savedUser();
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("SecurePass1", "$2a$encoded")).thenReturn(true);
            when(jwtService.generateRefreshToken("user-alice")).thenReturn("rt");
            when(jwtService.generateAccessToken("user-alice", "student")).thenReturn("at");
            when(userRepository.save(any())).thenReturn(user);

            service.login(loginRequest());

            assertThat(user.getLastLogin()).isNotNull();
        }
    }

    // ── resetPasswordDirect() ────────────────────────────────────────────────

    @Nested
    @DisplayName("resetPasswordDirect()")
    class ResetPasswordDirect {

        @Test
        @DisplayName("Réinitialisation réussie → hash mis à jour, hint sauvegardé")
        void success_updatesHashAndHint() {
            User user = savedUser();
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.encode("NewPass123")).thenReturn("$2a$new");
            when(userRepository.save(any())).thenReturn(user);

            service.resetPasswordDirect("alice@example.com", "NewPass123", "Mon prénom");

            assertThat(user.getPasswordHash()).isEqualTo("$2a$new");
            assertThat(user.getPasswordHint()).isEqualTo("Mon prénom");
            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("Email introuvable → lève NOT_FOUND")
        void emailNotFound_throwsNotFound() {
            when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    service.resetPasswordDirect("unknown@example.com", "NewPass123", null))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value())
                            .isEqualTo(404));
        }

        @Test
        @DisplayName("Nouveau mot de passe trop court → lève BAD_REQUEST")
        void shortPassword_throwsBadRequest() {
            User user = savedUser();
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

            assertThatThrownBy(() ->
                    service.resetPasswordDirect("alice@example.com", "abc", null))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(BAD_REQUEST));
        }

        @Test
        @DisplayName("Compte suspendu → lève FORBIDDEN")
        void suspendedAccount_throwsForbidden() {
            User user = savedUser();
            user.setStatus("suspended");
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

            assertThatThrownBy(() ->
                    service.resetPasswordDirect("alice@example.com", "NewPass123", null))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(FORBIDDEN));
        }
    }

    // ── getPasswordHint() ────────────────────────────────────────────────────

    @Nested
    @DisplayName("getPasswordHint()")
    class GetPasswordHint {

        @Test
        @DisplayName("Utilisateur avec hint → retourne le hint")
        void userWithHint_returnsHint() {
            User user = savedUser();
            user.setPasswordHint("Mon prénom");
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

            assertThat(service.getPasswordHint("alice@example.com")).isEqualTo("Mon prénom");
        }

        @Test
        @DisplayName("Utilisateur introuvable → retourne chaîne vide (sans divulguer l'existence)")
        void unknownEmail_returnsEmpty() {
            when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

            assertThat(service.getPasswordHint("ghost@example.com")).isEqualTo("");
        }

        @Test
        @DisplayName("Email null → retourne chaîne vide")
        void nullEmail_returnsEmpty() {
            assertThat(service.getPasswordHint(null)).isEqualTo("");
        }
    }
}
