package com.syncstudy.service;

import com.syncstudy.dto.response.UserResponse;
import com.syncstudy.model.StudyGroup;
import com.syncstudy.model.StudySession;
import com.syncstudy.model.User;
import com.syncstudy.repository.StudyGroupRepository;
import com.syncstudy.repository.StudySessionRepository;
import com.syncstudy.repository.SubjectRepository;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Tests unitaires pour {@link AdminService}.
 *
 * Couvre : deleteUser, toggleStatus, createUser.
 * Toutes les dépendances (repos, services) sont mockées.
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private UserRepository          userRepository;
    @Mock private StudySessionRepository  sessionRepository;
    @Mock private StudyGroupRepository    groupRepository;
    @Mock private SubjectRepository       subjectRepository;
    @Mock private PasswordResetService    passwordResetService;
    @Mock private PasswordEncoder         passwordEncoder;
    @Mock private NotificationService     notificationService;

    @InjectMocks
    private AdminService service;

    // ── Fixtures ──────────────────────────────────────────────────────────────

    private User studentUser() {
        return User.builder()
                .id("student-id")
                .name("Alice Martin")
                .email("alice@example.com")
                .passwordHash("hashed")
                .role("student")
                .status("active")
                .school("ENSA")
                .createdAt(LocalDateTime.now())
                .refreshTokens(new ArrayList<>())
                .build();
    }

    private User adminUser() {
        return User.builder()
                .id("admin-id")
                .name("Admin")
                .email("admin@syncstudy.com")
                .passwordHash("hashed")
                .role("admin")
                .status("active")
                .createdAt(LocalDateTime.now())
                .refreshTokens(new ArrayList<>())
                .build();
    }

    // ── deleteUser() ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteUser()")
    class DeleteUser {

        @Test
        @DisplayName("Suppression réussie → supprime sessions, retire des groupes, notifie l'admin")
        void success_deletesSessionsGroupsAndNotifiesAdmin() {
            User alice = studentUser();
            when(userRepository.findById("student-id")).thenReturn(Optional.of(alice));
            when(sessionRepository.findByUserId("student-id")).thenReturn(List.of(
                    StudySession.builder().id("s1").userId("student-id").subjectId("sub1").build()
            ));

            StudyGroup group = StudyGroup.builder()
                    .id("group-1")
                    .ownerId("other-owner")
                    .memberIds(new ArrayList<>(List.of("student-id", "other-member")))
                    .build();
            when(groupRepository.findAll()).thenReturn(List.of(group));
            when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser()));

            service.deleteUser("student-id");

            // sessions supprimées
            verify(sessionRepository).deleteAll(anyList());
            // userId retiré du groupe
            assertThat(group.getMemberIds()).doesNotContain("student-id");
            verify(groupRepository).saveAll(anyList());
            // user supprimé
            verify(userRepository).deleteById("student-id");
            // notification admin
            verify(notificationService).push(
                    eq("admin-id"),
                    eq("user_deleted"),
                    anyString(),
                    anyString(),
                    anyString(),
                    isNull()
            );
        }

        @Test
        @DisplayName("Suppression d'un compte admin → lève FORBIDDEN")
        void adminAccount_throwsForbidden() {
            User admin = adminUser();
            when(userRepository.findById("admin-id")).thenReturn(Optional.of(admin));

            assertThatThrownBy(() -> service.deleteUser("admin-id"))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(FORBIDDEN));

            verify(userRepository, never()).deleteById(anyString());
        }

        @Test
        @DisplayName("Utilisateur introuvable → lève NOT_FOUND")
        void userNotFound_throwsNotFound() {
            when(userRepository.findById("ghost-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.deleteUser("ghost-id"))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(NOT_FOUND));
        }

        @Test
        @DisplayName("Utilisateur propriétaire d'un groupe → ownerId du groupe mis à null")
        void userIsGroupOwner_ownerIdSetToNull() {
            User alice = studentUser();
            when(userRepository.findById("student-id")).thenReturn(Optional.of(alice));
            when(sessionRepository.findByUserId("student-id")).thenReturn(List.of());

            StudyGroup group = StudyGroup.builder()
                    .id("group-1")
                    .ownerId("student-id") // alice est owner
                    .memberIds(new ArrayList<>(List.of("student-id")))
                    .build();
            when(groupRepository.findAll()).thenReturn(List.of(group));
            when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser()));

            service.deleteUser("student-id");

            assertThat(group.getOwnerId()).isNull();
        }
    }

    // ── toggleStatus() ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("toggleStatus()")
    class ToggleStatus {

        @Test
        @DisplayName("Suspension → statut 'suspended', notification admin 'user_suspended'")
        void suspend_updatesStatusAndNotifiesAdmin() {
            User alice = studentUser();
            when(userRepository.findById("student-id")).thenReturn(Optional.of(alice));
            when(userRepository.save(any())).thenReturn(alice);
            when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser()));

            service.toggleStatus("student-id", "suspended");

            assertThat(alice.getStatus()).isEqualTo("suspended");
            verify(notificationService).push(
                    eq("admin-id"),
                    eq("user_suspended"),
                    anyString(),
                    anyString(),
                    anyString(),
                    eq("alice@example.com")
            );
        }

        @Test
        @DisplayName("Réactivation → statut 'active', notification admin 'user_reactivated'")
        void reactivate_updatesStatusAndNotifiesAdmin() {
            User alice = studentUser();
            alice.setStatus("suspended");
            when(userRepository.findById("student-id")).thenReturn(Optional.of(alice));
            when(userRepository.save(any())).thenReturn(alice);
            when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser()));

            service.toggleStatus("student-id", "active");

            assertThat(alice.getStatus()).isEqualTo("active");
            verify(notificationService).push(
                    eq("admin-id"),
                    eq("user_reactivated"),
                    anyString(),
                    anyString(),
                    anyString(),
                    eq("alice@example.com")
            );
        }

        @Test
        @DisplayName("Utilisateur introuvable → lève NOT_FOUND")
        void userNotFound_throwsNotFound() {
            when(userRepository.findById("ghost")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.toggleStatus("ghost", "suspended"))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(NOT_FOUND));
        }
    }

    // ── createUser() ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("createUser()")
    class CreateUser {

        private Map<String, String> validBody() {
            return Map.of(
                    "name", "Bob Dupont",
                    "email", "bob@example.com",
                    "password", "BobPass123",
                    "role", "student",
                    "school", "ESI",
                    "level", "Master 1"
            );
        }

        @Test
        @DisplayName("Création réussie → user sauvegardé, notification admin, response retournée")
        void success_savesUserAndNotifiesAdmin() {
            when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
            when(passwordEncoder.encode("BobPass123")).thenReturn("$2a$hashed");

            // AdminService.createUser() ne capture pas le retour de save() → il faut
            // injecter l'ID directement sur l'objet passé en paramètre (comme MongoDB le ferait).
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                if (u.getId() == null) u.setId("bob-id");
                return u;
            });
            when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser()));

            UserResponse response = service.createUser(validBody());

            assertThat(response.getEmail()).isEqualTo("bob@example.com");
            assertThat(response.getRole()).isEqualTo("student");
            verify(notificationService).push(
                    eq("admin-id"),
                    eq("user_created"),
                    anyString(),
                    anyString(),
                    anyString(),
                    eq("bob@example.com")
            );
        }

        @Test
        @DisplayName("Email déjà utilisé → lève CONFLICT")
        void duplicateEmail_throwsConflict() {
            when(userRepository.existsByEmail("bob@example.com")).thenReturn(true);

            assertThatThrownBy(() -> service.createUser(validBody()))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(CONFLICT));

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Email manquant → lève BAD_REQUEST")
        void missingEmail_throwsBadRequest() {
            Map<String, String> body = Map.of("password", "Pass123");

            assertThatThrownBy(() -> service.createUser(body))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value())
                            .isEqualTo(400));
        }

        @Test
        @DisplayName("Mot de passe manquant → lève BAD_REQUEST")
        void missingPassword_throwsBadRequest() {
            when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
            Map<String, String> body = Map.of("email", "bob@example.com", "name", "Bob");

            assertThatThrownBy(() -> service.createUser(body))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value())
                            .isEqualTo(400));
        }

        @Test
        @DisplayName("Email normalisé en minuscules avant sauvegarde")
        void emailNormalized_toLowerCase() {
            when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("hashed");

            User savedBob = User.builder()
                    .id("bob-id").name("Bob").email("bob@example.com")
                    .passwordHash("hashed").role("student").status("active")
                    .createdAt(LocalDateTime.now()).refreshTokens(new ArrayList<>())
                    .build();
            when(userRepository.save(any())).thenReturn(savedBob);
            when(userRepository.findByRole("admin")).thenReturn(List.of());

            service.createUser(Map.of(
                    "email", "BOB@EXAMPLE.COM",
                    "password", "BobPass123",
                    "name", "Bob"
            ));

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getEmail()).isEqualTo("bob@example.com");
        }
    }

    // ── sendResetPassword() ──────────────────────────────────────────────────

    @Nested
    @DisplayName("sendResetPassword()")
    class SendResetPassword {

        @Test
        @DisplayName("Réinitialisation par ID → appelle passwordResetService et notifie l'admin")
        void byUserId_callsResetServiceAndNotifiesAdmin() {
            User alice = studentUser();
            when(userRepository.findById("student-id")).thenReturn(Optional.of(alice));
            when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser()));

            service.sendResetPassword("student-id");

            verify(passwordResetService).requestReset("alice@example.com");
            verify(notificationService).push(
                    eq("admin-id"),
                    eq("password_reset"),
                    anyString(),
                    anyString(),
                    anyString(),
                    eq("alice@example.com")
            );
        }

        @Test
        @DisplayName("Utilisateur introuvable → lève NOT_FOUND")
        void userNotFound_throwsNotFound() {
            when(userRepository.findById("ghost")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.sendResetPassword("ghost"))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                            .isEqualTo(NOT_FOUND));

            verify(passwordResetService, never()).requestReset(anyString());
        }
    }
}
