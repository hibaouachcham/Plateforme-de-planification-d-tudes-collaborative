package com.syncstudy.service;

import com.syncstudy.model.StudySession;
import com.syncstudy.model.User;
import com.syncstudy.repository.StudySessionRepository;
import com.syncstudy.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Planificateur de rappels de sessions.
 *
 * Deux rappels sont envoyés pour chaque session :
 *   1. La veille (J-1) : rappel anticipé pour préparer la session du lendemain.
 *   2. 15 minutes avant le début : rappel immédiat pour ne pas rater le démarrage.
 *
 * Chaque type de rappel utilise une clé unique (id + "#day" ou id + "#15min")
 * pour éviter les doublons entre deux ticks du scheduler.
 */
@Component
public class SessionReminderScheduler {

    private static final DateTimeFormatter TIME_FMT     = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT     = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    private final StudySessionRepository sessionRepository;
    private final UserRepository         userRepository;
    private final NotificationService    notificationService;

    /** Clés déjà notifiées : "{sessionId}#day" ou "{sessionId}#15min" */
    private final Set<String> notifiedKeys = new HashSet<>();

    public SessionReminderScheduler(StudySessionRepository sessionRepository,
                                    UserRepository userRepository,
                                    NotificationService notificationService) {
        this.sessionRepository   = sessionRepository;
        this.userRepository      = userRepository;
        this.notificationService = notificationService;
    }

    // ─────────────────────────────────────────────────────────────────
    // Rappel J-1 : s'exécute toutes les minutes avec une large fenêtre
    // [+14h, +26h] pour couvrir toute la journée précédant la session.
    // La déduplication (#day) garantit qu'on n'envoie qu'un seul rappel.
    // Ex : session le 03/05 à 8h ou 10h → rappel envoyé dès aujourd'hui
    //      peu importe l'heure à laquelle le scheduler tourne.
    // ─────────────────────────────────────────────────────────────────
    @Scheduled(fixedRate = 60_000) // toutes les minutes
    public void sendDayBeforeReminders() {
        LocalDateTime now      = LocalDateTime.now();
        // Fenêtre large : sessions commençant dans 14h à 26h
        // Couvre n'importe quelle session du lendemain quelle que soit l'heure actuelle
        LocalDateTime from23h  = now.plusHours(14);
        LocalDateTime to25h    = now.plusHours(26);

        List<StudySession> tomorrow = sessionRepository.findByStartTimeBetween(from23h, to25h);

        for (StudySession session : tomorrow) {
            String key = session.getId() + "#day";
            if (notifiedKeys.contains(key)) continue;
            if (isExcluded(session)) continue;

            String userId      = session.getUserId();
            if (!hasPushEnabled(userId)) continue; // l'utilisateur a désactivé les rappels
            String name        = resolveSessionName(session);
            String dateTimeStr = session.getStartTime() != null
                    ? session.getStartTime().format(DATETIME_FMT) : "?";
            String duration    = computeDuration(session);
            String sessionType = session.isGroupSession() ? "Session en groupe" : "Session personnelle";

            notificationService.push(
                    userId,
                    "reminder",
                    "Rappel J-1 : « " + name + " » demain",
                    "Vous avez une session d'étude prévue demain. Préparez vos supports et vérifiez vos disponibilités.",
                    "Type : " + sessionType
                            + "  ·  Début prévu : " + dateTimeStr
                            + "  ·  Durée prévue : " + duration,
                    session.getId()
            );

            notifiedKeys.add(key);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Rappel 15 min avant : s'exécute toutes les minutes
    // ─────────────────────────────────────────────────────────────────
    @Scheduled(fixedRate = 60_000) // toutes les minutes
    public void sendFifteenMinuteReminders() {
        LocalDateTime now  = LocalDateTime.now();
        // Fenêtre : sessions qui débutent entre +14min et +16min
        LocalDateTime from = now.plusMinutes(14);
        LocalDateTime to   = now.plusMinutes(16);

        List<StudySession> upcoming = sessionRepository.findByStartTimeBetween(from, to);

        for (StudySession session : upcoming) {
            String key = session.getId() + "#15min";
            if (notifiedKeys.contains(key)) continue;
            if (isExcluded(session)) continue;

            String userId      = session.getUserId();
            if (!hasPushEnabled(userId)) continue; // l'utilisateur a désactivé les rappels
            String name        = resolveSessionName(session);
            String startStr    = session.getStartTime() != null ? session.getStartTime().format(TIME_FMT) : "?";
            String dateStr     = session.getStartTime() != null ? session.getStartTime().format(DATE_FMT) : "";
            String duration    = computeDuration(session);
            String sessionType = session.isGroupSession() ? "Session en groupe" : "Session personnelle";

            notificationService.push(
                    userId,
                    "reminder",
                    "⏰ « " + name + " » commence dans 15 minutes !",
                    "Votre session démarre à " + startStr + ". Préparez votre espace de travail et rejoignez la session à l'heure.",
                    "Type : " + sessionType
                            + "  ·  Date : " + dateStr
                            + "  ·  Heure de début : " + startStr
                            + "  ·  Durée prévue : " + duration,
                    session.getId()
            );

            notifiedKeys.add(key);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Vérifie si l'utilisateur a activé les rappels push dans ses préférences.
     * Par défaut (préférence absente) → true (rappels activés).
     */
    private boolean hasPushEnabled(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return false;
        User.UserPreferences prefs = userOpt.get().getPreferences();
        if (prefs == null) return true; // pas de prefs → comportement par défaut = activé
        return prefs.isPushNotifications();
    }

    /** Vrai si la session ne doit pas recevoir de rappel (statut terminal). */
    private boolean isExcluded(StudySession s) {
        String st = s.getStatus();
        return "expired".equalsIgnoreCase(st)
                || "completed".equalsIgnoreCase(st)
                || "unscheduled".equalsIgnoreCase(st);
    }

    private String resolveSessionName(StudySession s) {
        if (s.getTitle() != null && !s.getTitle().isBlank()) return s.getTitle();
        return "Session d'étude";
    }

    private String computeDuration(StudySession s) {
        if (s.getStartTime() == null || s.getEndTime() == null) return "—";
        long minutes = Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
        if (minutes <= 0) return "—";
        if (minutes >= 60) {
            long h = minutes / 60;
            long m = minutes % 60;
            return m > 0 ? h + "h" + m + "min" : h + "h";
        }
        return minutes + " min";
    }
}
