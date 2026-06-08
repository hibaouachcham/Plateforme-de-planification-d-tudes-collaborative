package com.syncstudy.service;

import com.syncstudy.model.Notification;
import com.syncstudy.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires pour {@link NotificationService}.
 *
 * Vérifie :
 *  - La résolution des icônes et couleurs selon le type de notification
 *  - Le comportement de push() avec types connus et inconnus
 *  - markRead() et markAllRead()
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService service;

    private static final String USER_ID = "user-abc";

    @BeforeEach
    void setUp() {
        // when save() est appelé, retourner l'objet passé en paramètre
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ── push() ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("push() avec type connu 'user_registered' → icône 'how_to_reg' et couleur emerald")
    void push_knownType_userRegistered_setsCorrectIconAndColor() {
        service.push(USER_ID, "user_registered", "Nouvelle inscription",
                "Alice a créé un compte.", null, "alice@example.com");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getIcon()).isEqualTo("how_to_reg");
        assertThat(saved.getColorClass()).contains("emerald");
        assertThat(saved.getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getType()).isEqualTo("user_registered");
        assertThat(saved.getReferenceId()).isEqualTo("alice@example.com");
        assertThat(saved.isRead()).isFalse();
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("push() avec type connu 'user_suspended' → icône 'block' et couleur orange")
    void push_knownType_userSuspended_setsCorrectIconAndColor() {
        service.push(USER_ID, "user_suspended", "Compte suspendu", "Bob suspendu.", null, "bob@example.com");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getIcon()).isEqualTo("block");
        assertThat(saved.getColorClass()).contains("orange");
    }

    @Test
    @DisplayName("push() avec type connu 'user_reactivated' → icône 'check_circle' et couleur teal")
    void push_knownType_userReactivated_setsCorrectIconAndColor() {
        service.push(USER_ID, "user_reactivated", "Compte réactivé", "Bob réactivé.", null, null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getIcon()).isEqualTo("check_circle");
        assertThat(saved.getColorClass()).contains("teal");
    }

    @Test
    @DisplayName("push() avec type connu 'user_deleted' → icône 'person_remove' et couleur red")
    void push_knownType_userDeleted_setsCorrectIconAndColor() {
        service.push(USER_ID, "user_deleted", "Compte supprimé", "Carol supprimée.", null, null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getIcon()).isEqualTo("person_remove");
        assertThat(saved.getColorClass()).contains("red");
    }

    @Test
    @DisplayName("push() avec type connu 'password_reset' → icône 'lock_reset' et couleur blue")
    void push_knownType_passwordReset_setsCorrectIconAndColor() {
        service.push(USER_ID, "password_reset", "Réinitialisation", "Mot de passe changé.", null, null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getIcon()).isEqualTo("lock_reset");
        assertThat(saved.getColorClass()).contains("blue");
    }

    @Test
    @DisplayName("push() avec type connu 'reminder' → icône 'alarm' et couleur amber")
    void push_knownType_reminder_setsCorrectIconAndColor() {
        service.push(USER_ID, "reminder", "Rappel", "Session dans 30 min.", null, null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        assertThat(captor.getValue().getIcon()).isEqualTo("alarm");
        assertThat(captor.getValue().getColorClass()).contains("amber");
    }

    @Test
    @DisplayName("push() avec type inconnu → icône et couleur par défaut (slate)")
    void push_unknownType_setsDefaultIconAndColor() {
        service.push(USER_ID, "type_inconnu_xyz", "Titre", "Message", null, null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getIcon()).isEqualTo("notifications");
        assertThat(saved.getColorClass()).contains("slate");
    }

    @Test
    @DisplayName("push() avec details non null → details correctement persisté")
    void push_withDetails_detailsArePersisted() {
        String details = "Nom : Alice  ·  École : ENSA";
        service.push(USER_ID, "user_registered", "Titre", "Message", details, "alice@example.com");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        assertThat(captor.getValue().getDetails()).isEqualTo(details);
    }

    // ── markRead() ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("markRead() → trouve la notification par ID, la marque comme lue et la sauvegarde")
    void markRead_setsReadToTrue() {
        Notification notif = Notification.builder()
                .id("notif-1")
                .userId(USER_ID)
                .read(false)
                .build();
        when(notificationRepository.findById("notif-1")).thenReturn(Optional.of(notif));

        service.markRead(USER_ID, "notif-1");

        assertThat(notif.isRead()).isTrue();
        verify(notificationRepository).save(notif);
    }

    @Test
    @DisplayName("markRead() → notification appartenant à un autre utilisateur → pas de sauvegarde")
    void markRead_wrongUser_doesNotSave() {
        Notification notif = Notification.builder()
                .id("notif-1")
                .userId("other-user")
                .read(false)
                .build();
        when(notificationRepository.findById("notif-1")).thenReturn(Optional.of(notif));

        service.markRead(USER_ID, "notif-1");

        assertThat(notif.isRead()).isFalse();
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("markRead() → notification introuvable → aucune action")
    void markRead_notFound_doesNothing() {
        when(notificationRepository.findById("notif-1")).thenReturn(Optional.empty());

        service.markRead(USER_ID, "notif-1");

        verify(notificationRepository, never()).save(any());
    }

    // ── markAllRead() ────────────────────────────────────────────────────────

    @Test
    @DisplayName("markAllRead() → marque toutes les notifications de l'utilisateur comme lues")
    void markAllRead_setsAllToRead() {
        Notification n1 = Notification.builder().id("n1").userId(USER_ID).read(false).build();
        Notification n2 = Notification.builder().id("n2").userId(USER_ID).read(false).build();
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(n1, n2));

        service.markAllRead(USER_ID);

        assertThat(n1.isRead()).isTrue();
        assertThat(n2.isRead()).isTrue();
        verify(notificationRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("markAllRead() → aucune notification → saveAll appelé avec liste vide")
    void markAllRead_noNotifications_saveAllCalledWithEmptyList() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of());

        service.markAllRead(USER_ID);

        verify(notificationRepository).saveAll(List.of());
    }
}
