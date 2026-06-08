package com.syncstudy.service;

import com.syncstudy.dto.response.UserResponse;
import com.syncstudy.model.StudyGroup;
import com.syncstudy.model.StudySession;
import com.syncstudy.model.Subject;
import com.syncstudy.model.User;
import com.syncstudy.repository.StudyGroupRepository;
import com.syncstudy.repository.StudySessionRepository;
import com.syncstudy.repository.SubjectRepository;
import com.syncstudy.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class AdminService {

    private final UserRepository          userRepository;
    private final StudySessionRepository  sessionRepository;
    private final StudyGroupRepository    groupRepository;
    private final SubjectRepository       subjectRepository;
    private final PasswordResetService    passwordResetService;
    private final PasswordEncoder         passwordEncoder;
    private final NotificationService     notificationService;

    public AdminService(
            UserRepository userRepository,
            StudySessionRepository sessionRepository,
            StudyGroupRepository groupRepository,
            SubjectRepository subjectRepository,
            PasswordResetService passwordResetService,
            PasswordEncoder passwordEncoder,
            NotificationService notificationService
    ) {
        this.userRepository       = userRepository;
        this.sessionRepository    = sessionRepository;
        this.groupRepository      = groupRepository;
        this.subjectRepository    = subjectRepository;
        this.passwordResetService = passwordResetService;
        this.passwordEncoder      = passwordEncoder;
        this.notificationService  = notificationService;
    }

    /** Trouve l'ID de l'admin pour lui envoyer des notifications. */
    private String getAdminId() {
        return userRepository.findByRole("admin").stream()
                .findFirst()
                .map(User::getId)
                .orElse(null);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private UserResponse toResponse(User user) {
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

    // ── public API ────────────────────────────────────────────────────────────

    public Page<UserResponse> listUsers(int page, int size) {
        List<UserResponse> all = userRepository.findAll().stream().map(this::toResponse).toList();
        int start = Math.min(page * size, all.size());
        int end   = Math.min(start + size, all.size());
        return new PageImpl<>(all.subList(start, end), PageRequest.of(page, size), all.size());
    }

    public void toggleStatus(String userId, String newStatus) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        user.setStatus(newStatus);
        userRepository.save(user);
        // Notification à l'admin
        String adminId = getAdminId();
        if (adminId != null) {
            boolean suspended = "suspended".equalsIgnoreCase(newStatus);
            notificationService.push(adminId,
                    suspended ? "user_suspended" : "user_reactivated",
                    suspended ? "Compte suspendu" : "Compte réactivé",
                    "Le compte de " + user.getName() + " a été " + (suspended ? "suspendu" : "réactivé") + " avec succès.",
                    "Nom : " + user.getName() + "  ·  Email : " + user.getEmail()
                            + "  ·  École : " + (user.getSchool() != null ? user.getSchool() : "—"),
                    user.getEmail()
            );
        }
    }

    /**
     * Supprime définitivement un utilisateur et toutes ses données associées.
     * Interdit de supprimer un compte admin.
     */
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Utilisateur introuvable"));
        if ("admin".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de supprimer un compte administrateur");
        }
        // Supprimer les sessions de l'utilisateur
        sessionRepository.deleteAll(sessionRepository.findByUserId(userId));
        // Retirer l'utilisateur de tous les groupes
        List<StudyGroup> groups = groupRepository.findAll();
        for (StudyGroup g : groups) {
            if (g.getMemberIds() != null) g.getMemberIds().remove(userId);
            if (userId.equals(g.getOwnerId())) g.setOwnerId(null);
        }
        groupRepository.saveAll(groups);
        // Supprimer le compte
        String deletedName  = user.getName();
        String deletedEmail = user.getEmail();
        String deletedSchool = user.getSchool() != null ? user.getSchool() : "—";
        userRepository.deleteById(userId);
        // Notification à l'admin
        String adminId = getAdminId();
        if (adminId != null) {
            notificationService.push(adminId,
                    "user_deleted",
                    "Compte supprimé",
                    "Le compte de " + deletedName + " (" + deletedEmail + ") a été supprimé définitivement.",
                    "Nom : " + deletedName + "  ·  Email : " + deletedEmail + "  ·  École : " + deletedSchool,
                    null
            );
        }
    }

    public void sendResetPassword(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        passwordResetService.requestReset(user.getEmail());
        // Notification à l'admin
        String adminId = getAdminId();
        if (adminId != null) {
            notificationService.push(adminId,
                    "password_reset",
                    "Réinitialisation de mot de passe",
                    "Le mot de passe de " + user.getName() + " a été réinitialisé.",
                    "Nom : " + user.getName() + "  ·  Email : " + user.getEmail(),
                    user.getEmail()
            );
        }
    }

    public void sendResetPasswordByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        String normalized = email.trim().toLowerCase();
        passwordResetService.requestReset(normalized);
        // Notification à l'admin
        String adminId = getAdminId();
        if (adminId != null) {
            String userName = userRepository.findByEmail(normalized)
                    .map(User::getName).orElse(normalized);
            notificationService.push(adminId,
                    "password_reset",
                    "Réinitialisation de mot de passe",
                    "Le mot de passe de " + userName + " a été réinitialisé.",
                    "Email : " + normalized,
                    normalized
            );
        }
    }

    /** Crée un compte utilisateur depuis l'espace admin. */
    public UserResponse createUser(Map<String, String> body) {
        String email = (body.getOrDefault("email", "")).trim().toLowerCase();
        if (email.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email requis");
        if (userRepository.existsByEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");

        String rawPassword = body.getOrDefault("password", "").trim();
        if (rawPassword.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe requis");

        User user = User.builder()
                .name(body.getOrDefault("name", "").trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(body.getOrDefault("role", "student"))
                .status("active")
                .school(body.getOrDefault("school", ""))
                .level(body.getOrDefault("level", ""))
                .onboardingCompleted(false)
                .createdAt(LocalDateTime.now())
                .refreshTokens(new java.util.ArrayList<>())
                .build();
        userRepository.save(user);
        // Notification à l'admin
        String adminId = getAdminId();
        if (adminId != null && !user.getId().equals(adminId)) {
            notificationService.push(adminId,
                    "user_created",
                    "Utilisateur créé",
                    "Un nouveau compte a été créé pour " + user.getName() + " (" + email + ").",
                    "Nom : " + user.getName() + "  ·  Email : " + email
                            + "  ·  Rôle : " + user.getRole()
                            + "  ·  École : " + (user.getSchool() != null && !user.getSchool().isBlank() ? user.getSchool() : "—"),
                    email
            );
        }
        return toResponse(user);
    }

    /** Statistiques complètes pour le dashboard admin. */
    public Map<String, Object> getDashboardStats() {
        LocalDateTime now          = LocalDateTime.now();
        LocalDateTime sevenDaysAgo = now.minusDays(7);
        LocalDate     today        = LocalDate.now();

        List<User>         allUsers    = userRepository.findAll();
        List<StudySession> allSessions = sessionRepository.findAll();
        List<StudyGroup>   allGroups   = groupRepository.findAll();

        // ── KPIs de base ──────────────────────────────────────────────────────
        long totalUsers    = allUsers.size();
        long activeUsers   = allUsers.stream()
                .filter(u -> "active".equalsIgnoreCase(u.getStatus())
                          && !"admin".equalsIgnoreCase(u.getRole()))
                .count();
        long newUsersThisWeek = allUsers.stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(sevenDaysAgo))
                .count();
        long totalSessions      = allSessions.size();
        long completedSessions  = allSessions.stream()
                .filter(s -> "completed".equalsIgnoreCase(s.getStatus())).count();
        int  completionRate     = totalSessions == 0 ? 0
                : (int) Math.round((double) completedSessions / totalSessions * 100);
        long activeGroups  = allGroups.size();
        double avgGroupSize = allGroups.isEmpty() ? 0 :
                allGroups.stream()
                        .mapToInt(g -> g.getMemberIds() == null ? 0 : g.getMemberIds().size())
                        .average().orElse(0);

        // ── Heures d'étude ce mois ─────────────────────────────────────────────
        long totalMinutesThisMonth = allSessions.stream()
                .filter(s -> "completed".equalsIgnoreCase(s.getStatus()))
                .filter(s -> s.getEndTime() != null
                        && s.getEndTime().getMonthValue() == today.getMonthValue()
                        && s.getEndTime().getYear()       == today.getYear())
                .mapToLong(s -> {
                    if (s.getActualDurationMinutes() != null) return s.getActualDurationMinutes();
                    if (s.getStartTime() != null && s.getEndTime() != null)
                        return java.time.Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
                    return 0L;
                }).sum();
        long totalStudyHoursThisMonth = totalMinutesThisMonth / 60;

        // ── Statut des sessions ────────────────────────────────────────────────
        Map<String, Long> sessionsByStatus = allSessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getStatus() != null ? s.getStatus() : "planned",
                        Collectors.counting()
                ));

        // ── Inscriptions par jour (7 derniers jours) ──────────────────────────
        String[] frDay = {"Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"};
        List<Map<String, Object>> registrationsByDay = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date     = today.minusDays(i);
            String    dayLabel = frDay[date.getDayOfWeek().getValue() % 7];
            final LocalDate fd = date;
            long count = allUsers.stream()
                    .filter(u -> u.getCreatedAt() != null
                              && u.getCreatedAt().toLocalDate().equals(fd))
                    .count();
            Map<String, Object> entry = new HashMap<>();
            entry.put("day",   dayLabel);
            entry.put("count", count);
            registrationsByDay.add(entry);
        }

        // ── Top 5 matières ────────────────────────────────────────────────────
        Map<String, Long> subjectIdCounts = allSessions.stream()
                .filter(s -> s.getSubjectId() != null && !s.getSubjectId().isBlank())
                .collect(Collectors.groupingBy(StudySession::getSubjectId, Collectors.counting()));

        Map<String, Long> subjectNameCounts = new HashMap<>();
        for (Map.Entry<String, Long> e : subjectIdCounts.entrySet()) {
            String name = subjectRepository.findById(e.getKey())
                    .map(Subject::getName).orElse(null);
            if (name != null && !name.isBlank())
                subjectNameCounts.merge(name, e.getValue(), Long::sum);
        }
        List<Map<String, Object>> topSubjects = subjectNameCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name",  e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        // ── Distribution par niveau ────────────────────────────────────────────
        Map<String, Long> usersByLevel = allUsers.stream()
                .filter(u -> !"admin".equalsIgnoreCase(u.getRole()))
                .filter(u -> u.getLevel() != null && !u.getLevel().isBlank())
                .collect(Collectors.groupingBy(User::getLevel, Collectors.counting()));

        // ── Activité par créneau horaire (0–23) ───────────────────────────────
        int[] hourArr = new int[24];
        allSessions.stream()
                .filter(s -> s.getStartTime() != null)
                .forEach(s -> hourArr[s.getStartTime().getHour()]++);
        List<Integer> hourlyActivity = new ArrayList<>();
        for (int h : hourArr) hourlyActivity.add(h);

        // ── Derniers utilisateurs inscrits ────────────────────────────────────
        List<Map<String, Object>> recentUsers = allUsers.stream()
                .filter(u -> u.getCreatedAt() != null && !"admin".equalsIgnoreCase(u.getRole()))
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .limit(5)
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    String nm    = u.getName() != null ? u.getName().trim() : "";
                    String[] pts = nm.split("\\s+");
                    String initials = pts.length >= 2
                            ? ("" + pts[0].charAt(0) + pts[pts.length - 1].charAt(0)).toUpperCase()
                            : (nm.length() >= 2 ? nm.substring(0, 2).toUpperCase()
                                                : nm.toUpperCase());
                    m.put("name",       nm);
                    m.put("school",     u.getSchool()  != null ? u.getSchool()  : "");
                    m.put("level",      u.getLevel()   != null ? u.getLevel()   : "");
                    m.put("initials",   initials);
                    m.put("minutesAgo", java.time.Duration.between(u.getCreatedAt(), now).toMinutes());
                    return m;
                })
                .collect(Collectors.toList());

        // ── Assemblage ────────────────────────────────────────────────────────
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers",               totalUsers);
        stats.put("activeUsers",              activeUsers);
        stats.put("sessionsCreated",          totalSessions);   // compat alias
        stats.put("newUsersThisWeek",         newUsersThisWeek);
        stats.put("totalSessions",            totalSessions);
        stats.put("completedSessions",        completedSessions);
        stats.put("completionRate",           completionRate);
        stats.put("activeGroups",             activeGroups);
        stats.put("avgGroupSize",             Math.round(avgGroupSize * 10.0) / 10.0);
        stats.put("totalStudyHoursThisMonth", totalStudyHoursThisMonth);
        stats.put("sessionsByStatus",         sessionsByStatus);
        stats.put("registrationsByDay",       registrationsByDay);
        stats.put("topSubjects",              topSubjects);
        stats.put("usersByLevel",             usersByLevel);
        stats.put("hourlyActivity",           hourlyActivity);
        stats.put("recentUsers",              recentUsers);
        return stats;
    }
}
