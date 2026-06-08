package com.syncstudy.service;

import com.syncstudy.dto.request.CreateSessionRequest;
import com.syncstudy.model.Availability;
import com.syncstudy.model.StudyGroup;
import com.syncstudy.model.StudySession;
import com.syncstudy.repository.AvailabilityRepository;
import com.syncstudy.repository.StudyGroupRepository;
import com.syncstudy.repository.StudySessionRepository;
import com.syncstudy.repository.SubjectRepository;
import com.syncstudy.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class SessionService {
    private final StudySessionRepository sessionRepository;
    private final StudyGroupRepository groupRepository;
    // Injectés pour la vérification de disponibilité commune (règles métier groupes)
    private final AvailabilityRepository availabilityRepository;
    private final NotificationService notificationService;
    private final AvailabilityIntersectionService intersectionService;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;

    public SessionService(StudySessionRepository sessionRepository,
                          StudyGroupRepository groupRepository,
                          AvailabilityRepository availabilityRepository,
                          NotificationService notificationService,
                          AvailabilityIntersectionService intersectionService,
                          UserRepository userRepository,
                          SubjectRepository subjectRepository) {
        this.sessionRepository       = sessionRepository;
        this.groupRepository         = groupRepository;
        this.availabilityRepository  = availabilityRepository;
        this.notificationService     = notificationService;
        this.intersectionService     = intersectionService;
        this.userRepository          = userRepository;
        this.subjectRepository       = subjectRepository;
    }

    public List<StudySession> getSessionsByUser(String userId) {
        return markExpiredSessions(userId);
    }

    /**
     * Retourne uniquement les sessions qui appartiennent à l'utilisateur (userId = cet utilisateur).
     * Les sessions de groupe des autres membres ne sont JAMAIS incluses ici : chaque utilisateur
     * reçoit sa propre copie via syncGroupSessionsForUser() au chargement de l'application.
     * Cela garantit que la suppression est définitive (plus de "réapparition" via des copies croisées).
     */
    public List<StudySession> getAllVisibleSessions(String userId) {
        List<StudySession> own = new ArrayList<>(sessionRepository.findByUserId(userId));
        markExpiredSessionsInList(own);
        return own;
    }

    /**
     * Crée des copies des sessions de groupe des autres membres pour l'utilisateur courant,
     * uniquement pour les sessions non-expirées et non-terminées qu'il ne possède pas encore.
     * Appelé au démarrage de l'application pour garantir que l'utilisateur a bien ses propres
     * copies de toutes les sessions de groupe actives.
     */
    public int syncGroupSessionsForUser(String userId) {
        List<String> groupIds = groupRepository.findByMemberIdsContaining(userId)
                .stream().map(g -> g.getId()).toList();
        if (groupIds.isEmpty()) return 0;

        // Clés des sessions que l'utilisateur possède déjà (subjectId|startTronquée)
        Set<String> ownKeys = sessionRepository.findByUserId(userId).stream()
                .filter(s -> s.getSubjectId() != null && s.getStartTime() != null)
                .map(s -> s.getSubjectId() + "|"
                        + s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES))
                .collect(Collectors.toSet());

        // Sessions de groupe actives des autres membres que l'utilisateur ne possède pas encore
        Set<String> keysToAdd = new java.util.HashSet<>();
        List<StudySession> toCreate = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (StudySession s : sessionRepository.findByGroupIdIn(groupIds)) {
            if (userId.equals(s.getUserId())) continue;          // déjà propriétaire
            if (s.getSubjectId() == null || s.getStartTime() == null) continue;
            if (s.getEndTime() != null && s.getEndTime().isBefore(now)) continue; // session passée → ne pas recréer
            if ("expired".equalsIgnoreCase(s.getStatus()))   continue;           // expirée → ne pas recréer
            if ("completed".equalsIgnoreCase(s.getStatus())) continue;           // terminée → ne pas recréer

            String key = s.getSubjectId() + "|"
                    + s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
            if (ownKeys.contains(key)) continue;   // l'utilisateur a déjà sa copie
            if (!keysToAdd.add(key))    continue;  // éviter les doublons dans la liste à créer

            toCreate.add(StudySession.builder()
                    .userId(userId)
                    .subjectId(s.getSubjectId())
                    .groupId(s.getGroupId())
                    .title(s.getTitle())
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .objectives(s.getObjectives() != null ? new ArrayList<>(s.getObjectives()) : new ArrayList<>())
                    .groupSession(true)
                    .build());
        }

        if (!toCreate.isEmpty()) {
            sessionRepository.saveAll(toCreate);
        }
        return toCreate.size();
    }

    public StudySession createSession(String userId, CreateSessionRequest req) {

        // ── 1. Vérifier si une session identique existe déjà (doublon) ──────────
        if (req.getStartTime() != null && req.getSubjectId() != null) {
            LocalDateTime startTrunc = req.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
            Optional<StudySession> existing = sessionRepository.findByUserId(userId).stream()
                .filter(s -> req.getSubjectId().equals(s.getSubjectId())
                    && s.getStartTime() != null
                    && s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES).equals(startTrunc)
                    && !"unscheduled".equalsIgnoreCase(s.getStatus())) // ne pas bloquer sur une session non planifiée
                .findFirst();
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        // ── 2. Vérification de disponibilité commune (sessions de groupe) ────────
        //
        // Règles métier :
        //   - Calculer l'intersection des créneaux horaires de TOUS les membres.
        //   - Si le créneau demandé est couvert → session planifiée normalement.
        //   - Si aucune intersection ne couvre le créneau → session "unscheduled" +
        //     notification à tous les membres (pas de copie dans les calendriers).
        //
        if (req.isGroupSession() && req.getGroupId() != null && !req.getGroupId().isBlank()
                && req.getStartTime() != null && req.getEndTime() != null) {

            Optional<StudyGroup> groupOpt = groupRepository.findById(req.getGroupId());

            if (groupOpt.isPresent()) {
                StudyGroup group = groupOpt.get();
                List<String> allMemberIds = group.getMemberIds() != null
                        ? new ArrayList<>(group.getMemberIds())
                        : new ArrayList<>();
                // S'assurer que le créateur est bien dans la liste (robustesse)
                if (!allMemberIds.contains(userId)) {
                    allMemberIds.add(0, userId);
                }

                // Récupérer uniquement les membres qui ont configuré au moins une disponibilité.
                // Les membres sans disponibilité (profil incomplet) ne participent pas au calcul :
                // on ne peut pas bloquer la création à cause de données absentes.
                List<List<Availability>> memberAvailabilities = allMemberIds.stream()
                        .map(availabilityRepository::findByUserId)
                        .filter(avails -> !avails.isEmpty()) // ignorer les membres sans config
                        .collect(Collectors.toList());

                // On ne vérifie l'intersection que si au moins 2 membres ont des disponibilités
                // configurées (en dessous de 2, il n'y a pas assez de données pour calculer
                // une intersection significative → laisser passer normalement).
                if (memberAvailabilities.size() < 2) {
                    // Pas assez de membres avec disponibilités → skip la vérification
                    // (fall through vers la création normale en bas)
                } else {

                // Convertir le jour Java (MONDAY=1 … SUNDAY=7) vers la convention JS (0=Dim … 6=Sam)
                int dayOfWeek = req.getStartTime().getDayOfWeek().getValue() % 7;

                // Calculer les créneaux communs à tous les membres (qui ont configuré leur dispo)
                List<LocalTime[]> commonSlots = intersectionService.computeCommonSlots(
                        memberAvailabilities, dayOfWeek);

                LocalTime reqStart = req.getStartTime().toLocalTime();
                LocalTime reqEnd   = req.getEndTime().toLocalTime();

                boolean covered = !commonSlots.isEmpty()
                        && intersectionService.isSlotCoveredByCommon(reqStart, reqEnd, commonSlots);

                if (!covered) {
                    // ── Aucune disponibilité commune : session "unscheduled" ──────
                    // La session est créée pour le créateur UNIQUEMENT, sans copie
                    // dans les calendriers des autres membres (pas de chevauchement).
                    StudySession unscheduled = StudySession.builder()
                            .userId(userId)
                            .subjectId(req.getSubjectId())
                            .groupId(req.getGroupId())
                            .title(req.getTitle())
                            .startTime(req.getStartTime())
                            .endTime(req.getEndTime())
                            .objectives(req.getObjectives())
                            .note(req.getNote())
                            .groupSession(true)
                            .status("unscheduled")  // statut spécial : non planifié
                            .build();
                    StudySession saved = sessionRepository.save(unscheduled);

                    // BONUS : si des créneaux communs existent (mais ne couvrent pas
                    // le créneau demandé), inclure le meilleur dans la notification.
                    String details = null;
                    if (!commonSlots.isEmpty()) {
                        Optional<LocalTime[]> best = intersectionService.findLongestCommonSlot(commonSlots);
                        if (best.isPresent()) {
                            details = "Meilleur créneau commun disponible ce jour : "
                                    + best.get()[0] + " – " + best.get()[1];
                        }
                    }

                    // Résoudre le nom du créateur et de la matière pour enrichir la notification
                    String creatorName = userRepository.findById(userId)
                            .map(u -> u.getName() != null ? u.getName().trim() : "Un membre")
                            .orElse("Un membre");
                    String subjectName = (req.getSubjectId() != null && !req.getSubjectId().isBlank())
                            ? subjectRepository.findById(req.getSubjectId())
                                    .map(s -> s.getName() != null ? s.getName() : "")
                                    .orElse("")
                            : "";
                    String sessionTitle = (req.getTitle() != null && !req.getTitle().isBlank())
                            ? req.getTitle().trim() : subjectName;

                    // Titre de la notification
                    String notifTitle = "Session non planifiée"
                            + (sessionTitle.isBlank() ? "" : " : " + sessionTitle);

                    // Message principal
                    String notifMessage = creatorName + " a partagé une session"
                            + (subjectName.isBlank() ? "" : " de « " + subjectName + " »")
                            + " avec le groupe, mais aucune disponibilité commune n'a été trouvée."
                            + " Veuillez vous concerter pour convenir d'un créneau commun.";

                    // Détails enrichis
                    String sessionDate = saved.getStartTime() != null
                            ? saved.getStartTime().toLocalDate().toString() + " à "
                              + saved.getStartTime().toLocalTime().toString().substring(0, 5)
                            : null;
                    StringBuilder detailsBuilder = new StringBuilder();
                    if (!subjectName.isBlank()) detailsBuilder.append("Matière : ").append(subjectName);
                    if (sessionDate != null) {
                        if (detailsBuilder.length() > 0) detailsBuilder.append("  ·  ");
                        detailsBuilder.append("Créneau demandé : ").append(sessionDate);
                    }
                    if (!creatorName.equals("Un membre")) {
                        if (detailsBuilder.length() > 0) detailsBuilder.append("  ·  ");
                        detailsBuilder.append("Partagé par : ").append(creatorName);
                    }
                    if (details != null) {
                        if (detailsBuilder.length() > 0) detailsBuilder.append("  ·  ");
                        detailsBuilder.append(details);
                    }
                    final String finalDetails = detailsBuilder.length() > 0 ? detailsBuilder.toString() : null;
                    final String finalTitle   = notifTitle;
                    final String finalMessage = notifMessage;

                    // Notifier TOUS les membres du groupe
                    for (String memberId : allMemberIds) {
                        notificationService.push(
                                memberId,
                                "group_session",
                                finalTitle,
                                finalMessage,
                                finalDetails,
                                saved.getId()
                        );
                    }

                    return saved; // retour anticipé : pas de chevauchement à vérifier
                }
                // Si covered == true : on tombe dans le flux normal ci-dessous
                } // fin du bloc else (memberAvailabilities.size() >= 2)
            }
        }

        // ── 3. Vérifier le non-chevauchement (sessions planifiées seulement) ────
        if (req.getStartTime() != null && req.getEndTime() != null) {
            boolean hasOverlap = sessionRepository.findByUserId(userId).stream()
                .filter(s -> !s.isDraft())
                .filter(s -> !"expired".equalsIgnoreCase(s.getStatus()))
                .filter(s -> !"completed".equalsIgnoreCase(s.getStatus()))
                .filter(s -> !"unscheduled".equalsIgnoreCase(s.getStatus())) // ne pas bloquer sur les non-planifiées
                .filter(s -> s.getEndTime() != null && s.getEndTime().isAfter(LocalDateTime.now()))
                .anyMatch(s -> s.getStartTime() != null && s.getEndTime() != null
                    && req.getStartTime().isBefore(s.getEndTime())
                    && req.getEndTime().isAfter(s.getStartTime()));
            if (hasOverlap) {
                throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Ce créneau chevauche une session existante"
                );
            }
        }

        // ── 4. Créer la session normalement (disponibilité commune confirmée) ────
        StudySession s = StudySession.builder()
                .userId(userId)
                .subjectId(req.getSubjectId())
                .groupId(req.getGroupId())
                .title(req.getTitle())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .objectives(req.getObjectives())
                .note(req.getNote())
                .groupSession(req.isGroupSession())
                .build();
        StudySession saved = sessionRepository.save(s);

        // ── 5. Créer les copies pour tous les autres membres du groupe ───────────
        if (req.isGroupSession() && req.getGroupId() != null && !req.getGroupId().isBlank()) {
            groupRepository.findById(req.getGroupId()).ifPresent(group -> {
                if (group.getMemberIds() == null) return;
                List<StudySession> memberSessions = group.getMemberIds().stream()
                    .filter(memberId -> !memberId.equals(userId)) // pas le créateur
                    .map(memberId -> StudySession.builder()
                        .userId(memberId)
                        .subjectId(req.getSubjectId())
                        .groupId(req.getGroupId())
                        .title(req.getTitle())
                        .startTime(req.getStartTime())
                        .endTime(req.getEndTime())
                        .objectives(req.getObjectives() != null
                                ? new ArrayList<>(req.getObjectives()) : new ArrayList<>())
                        .groupSession(true)
                        .build())
                    .toList();
                if (!memberSessions.isEmpty()) {
                    sessionRepository.saveAll(memberSessions);
                }
            });
        }

        return saved;
    }

    public StudySession updateSession(String userId, String sessionId, CreateSessionRequest req) {
        StudySession s = sessionRepository.findById(sessionId)
                .filter(x -> userId.equals(x.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
        s.setSubjectId(req.getSubjectId());
        s.setGroupId(req.getGroupId());
        s.setTitle(req.getTitle());
        s.setStartTime(req.getStartTime());
        s.setEndTime(req.getEndTime());
        s.setObjectives(req.getObjectives());
        s.setNote(req.getNote());
        return sessionRepository.save(s);
    }

    public void deleteSession(String userId, String sessionId) {
        Optional<StudySession> opt = sessionRepository.findById(sessionId);
        if (opt.isEmpty()) return;

        StudySession s = opt.get();
        boolean isOwner = userId.equals(s.getUserId());

        // Vérifier si l'utilisateur est membre du groupe (pour les sessions de groupe)
        boolean isGroupMember = false;
        if (!isOwner && s.getGroupId() != null && !s.getGroupId().isBlank()) {
            isGroupMember = groupRepository.findById(s.getGroupId())
                    .map(g -> g.getMemberIds() != null && g.getMemberIds().contains(userId))
                    .orElse(false);
        }

        // Refuser si ni propriétaire ni membre du groupe
        if (!isOwner && !isGroupMember) return;

        if (s.isGroupSession() && s.getGroupId() != null) {
            if (isOwner) {
                // Propriétaire : supprimer toutes les copies des membres du groupe
                List<StudySession> copies = sessionRepository.findByGroupIdIn(
                    List.of(s.getGroupId())
                ).stream()
                    .filter(c -> !c.getId().equals(sessionId))
                    .filter(c -> c.getStartTime() != null && s.getStartTime() != null
                        && c.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)
                           .equals(s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)))
                    .toList();
                if (!copies.isEmpty()) {
                    sessionRepository.deleteAllById(copies.stream().map(StudySession::getId).toList());
                }
                sessionRepository.deleteById(sessionId);
            } else {
                // Membre (pas propriétaire) : supprimer uniquement sa propre copie de cette session
                List<String> ownCopies = sessionRepository.findByGroupIdIn(List.of(s.getGroupId()))
                    .stream()
                    .filter(c -> userId.equals(c.getUserId()))
                    .filter(c -> c.getStartTime() != null && s.getStartTime() != null
                        && c.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)
                           .equals(s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)))
                    .map(StudySession::getId)
                    .collect(Collectors.toList());
                if (!ownCopies.isEmpty()) {
                    sessionRepository.deleteAllById(ownCopies);
                }
                // La session originale appartient au créateur → ne pas la supprimer
            }
        } else {
            // Session personnelle (non-groupe) : suppression directe
            sessionRepository.deleteById(sessionId);
        }
    }

    /**
     * Supprime uniquement la copie de la session appartenant à cet utilisateur,
     * sans toucher aux copies des autres membres du groupe.
     * Utilisé quand un membre retire une session de groupe de son propre calendrier.
     */
    public void deleteSessionCopyOnly(String userId, String sessionId) {
        sessionRepository.findById(sessionId)
                .filter(s -> userId.equals(s.getUserId()))
                .ifPresent(s -> sessionRepository.deleteById(sessionId));
    }

    /** Supprime toutes les sessions brouillon auto-générées de l'utilisateur */
    public void deleteDraftSessions(String userId) {
        sessionRepository.deleteByUserIdAndDraftTrueAndAutoGeneratedTrue(userId);
    }

    /** Supprime les sessions en doublon (même subjectId + startTime + endTime) en gardant la plus récente */
    public void deduplicateSessions(String userId) {
        List<StudySession> all = sessionRepository.findByUserId(userId);

        // Grouper par clé : subjectId + startTime tronquée à la minute + endTime tronquée à la minute
        java.util.Map<String, List<StudySession>> grouped = all.stream()
            .collect(java.util.stream.Collectors.groupingBy(s -> {
                String start = s.getStartTime() != null
                    ? s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES).toString()
                    : "";
                String end = s.getEndTime() != null
                    ? s.getEndTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES).toString()
                    : "";
                return s.getSubjectId() + "|" + start + "|" + end;
            }));

        List<String> toDelete = new java.util.ArrayList<>();
        for (List<StudySession> group : grouped.values()) {
            if (group.size() > 1) {
                // Trier : "completed" en premier, puis "in_progress", puis les autres
                group.sort((a, b) -> {
                    int rankA = statusRank(a.getStatus());
                    int rankB = statusRank(b.getStatus());
                    return Integer.compare(rankB, rankA); // décroissant : meilleur statut en premier
                });
                // Garder le premier (meilleur statut), supprimer les autres
                for (int i = 1; i < group.size(); i++) {
                    toDelete.add(group.get(i).getId());
                }
            }
        }
        if (!toDelete.isEmpty()) {
            sessionRepository.deleteAllById(toDelete);
        }
    }

    /**
     * Partage une session personnelle avec tous les membres d'un groupe.
     * Met à jour la session de l'owner (isGroupSession=true, groupId) et crée des copies pour les autres membres.
     */
    public StudySession shareSessionWithGroup(String userId, String sessionId, String groupId, String title) {
        StudySession s = sessionRepository.findById(sessionId)
            .filter(x -> userId.equals(x.getUserId()))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));

        // Utiliser le groupId existant si déjà défini, sinon utiliser celui fourni
        String effectiveGroupId = (s.getGroupId() != null && !s.getGroupId().isBlank())
            ? s.getGroupId() : groupId;

        var group = groupRepository.findById(effectiveGroupId)
            .filter(g -> g.getMemberIds() != null && g.getMemberIds().contains(userId))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Groupe introuvable ou non membre"));

        // Stocker le titre (nom de matière) si pas déjà défini
        if (title != null && !title.isBlank() && (s.getTitle() == null || s.getTitle().isBlank())) {
            s.setTitle(title);
        }
        s.setGroupSession(true);
        s.setGroupId(effectiveGroupId);
        StudySession saved = sessionRepository.save(s);

        // Membres qui ont déjà une copie pour ce créneau
        Set<String> membersWithCopy = sessionRepository.findByGroupIdIn(List.of(effectiveGroupId)).stream()
            .filter(c -> c.getStartTime() != null && s.getStartTime() != null
                && c.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)
                   .equals(s.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)))
            .map(StudySession::getUserId)
            .collect(Collectors.toSet());

        List<StudySession> copies = group.getMemberIds().stream()
            .filter(memberId -> !memberId.equals(userId))
            .filter(memberId -> !membersWithCopy.contains(memberId))
            .map(memberId -> StudySession.builder()
                .userId(memberId)
                .subjectId(s.getSubjectId())
                .groupId(effectiveGroupId)
                .title(s.getTitle())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .objectives(s.getObjectives() != null ? new ArrayList<>(s.getObjectives()) : new ArrayList<>())
                .groupSession(true)
                .build())
            .toList();

        if (!copies.isEmpty()) {
            sessionRepository.saveAll(copies);

            // Notifier les membres qui reçoivent la session partagée
            String sharerName = userRepository.findById(userId)
                    .map(u -> u.getName() != null ? u.getName().trim() : "Un membre")
                    .orElse("Un membre");
            String subjectNameShare = (saved.getSubjectId() != null && !saved.getSubjectId().isBlank())
                    ? subjectRepository.findById(saved.getSubjectId())
                            .map(sub -> sub.getName() != null ? sub.getName() : "")
                            .orElse("")
                    : "";
            String sessionTitleShare = (saved.getTitle() != null && !saved.getTitle().isBlank())
                    ? saved.getTitle().trim() : subjectNameShare;
            String notifTitleShare = "Session partagée"
                    + (sessionTitleShare.isBlank() ? "" : " : " + sessionTitleShare);
            String notifMessageShare = sharerName + " a partagé une session de groupe"
                    + (subjectNameShare.isBlank() ? "" : " de « " + subjectNameShare + " »")
                    + " avec vous. Elle a été ajoutée à votre planning.";
            String sessionDateShare = saved.getStartTime() != null
                    ? saved.getStartTime().toLocalDate().toString() + " à "
                      + saved.getStartTime().toLocalTime().toString().substring(0, 5)
                    : null;
            StringBuilder shareDetails = new StringBuilder();
            if (!subjectNameShare.isBlank()) shareDetails.append("Matière : ").append(subjectNameShare);
            if (sessionDateShare != null) {
                if (shareDetails.length() > 0) shareDetails.append("  ·  ");
                shareDetails.append("Date : ").append(sessionDateShare);
            }
            if (!sharerName.equals("Un membre")) {
                if (shareDetails.length() > 0) shareDetails.append("  ·  ");
                shareDetails.append("Partagé par : ").append(sharerName);
            }
            final String finalShareDetails = shareDetails.length() > 0 ? shareDetails.toString() : null;
            for (StudySession copy : copies) {
                notificationService.push(
                        copy.getUserId(),
                        "group_session",
                        notifTitleShare,
                        notifMessageShare,
                        finalShareDetails,
                        copy.getId()
                );
            }
        }
        return saved;
    }

    /**
     * Propage les sessions de groupe existantes aux membres qui n'ont pas encore de copie.
     * Utile pour migrer les sessions créées avant que la propagation automatique soit en place.
     * Retourne le nombre de copies créées.
     */
    public int propagateExistingGroupSessions(String userId) {
        // Migration : corriger les anciennes sessions qui ont groupId mais groupSession=false
        // (bug Jackson @JsonProperty : le flag n'était jamais persisté correctement)
        List<StudySession> sessionsToFix = sessionRepository.findByUserId(userId).stream()
            .filter(s -> s.getGroupId() != null && !s.getGroupId().isBlank() && !s.isGroupSession())
            .collect(Collectors.toList());
        if (!sessionsToFix.isEmpty()) {
            sessionsToFix.forEach(s -> s.setGroupSession(true));
            sessionRepository.saveAll(sessionsToFix);
        }

        List<StudySession> groupSessions = sessionRepository.findByUserId(userId).stream()
            .filter(s -> s.isGroupSession() && s.getGroupId() != null && !s.getGroupId().isBlank())
            .toList();

        if (groupSessions.isEmpty()) return 0;

        int created = 0;
        for (StudySession session : groupSessions) {
            String groupId = session.getGroupId();
            var groupOpt = groupRepository.findById(groupId);
            if (groupOpt.isEmpty()) continue;
            var group = groupOpt.get();
            if (group.getMemberIds() == null) continue;

            // Membres qui ont déjà une copie (même groupId + startTime tronquée)
            Set<String> membersWithCopy = sessionRepository.findByGroupIdIn(List.of(groupId)).stream()
                .filter(c -> c.getStartTime() != null && session.getStartTime() != null
                    && c.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)
                       .equals(session.getStartTime().truncatedTo(java.time.temporal.ChronoUnit.MINUTES)))
                .map(StudySession::getUserId)
                .collect(Collectors.toSet());

            List<StudySession> toCreate = group.getMemberIds().stream()
                .filter(memberId -> !memberId.equals(userId))
                .filter(memberId -> !membersWithCopy.contains(memberId))
                .map(memberId -> StudySession.builder()
                    .userId(memberId)
                    .subjectId(session.getSubjectId())
                    .groupId(groupId)
                    .title(session.getTitle())
                    .startTime(session.getStartTime())
                    .endTime(session.getEndTime())
                    .objectives(session.getObjectives() != null ? new ArrayList<>(session.getObjectives()) : new ArrayList<>())
                    .groupSession(true)
                    .build())
                .toList();

            if (!toCreate.isEmpty()) {
                sessionRepository.saveAll(toCreate);
                created += toCreate.size();
            }
        }
        return created;
    }

    private int statusRank(String status) {
        if ("completed".equalsIgnoreCase(status))   return 3;
        if ("in_progress".equalsIgnoreCase(status)) return 2;
        if ("planned".equalsIgnoreCase(status))     return 1;
        return 0;
    }

    /** Met à jour des champs partiels d'une session (note, todos, flashcards, etc.) */
    @SuppressWarnings("unchecked")
    public void patchSession(String userId, String sessionId, Map<String, Object> fields) {
        sessionRepository.findById(sessionId)
                .filter(s -> userId.equals(s.getUserId()))
                .ifPresent(s -> {
                    // Capturer le statut AVANT modification pour détecter le passage à "completed"
                    final boolean wasAlreadyCompleted = "completed".equalsIgnoreCase(s.getStatus());
                    if (fields.containsKey("note")) {
                        s.setNote((String) fields.get("note"));
                    }
                    if (fields.containsKey("sessionGoal")) {
                        s.setSessionGoal((String) fields.get("sessionGoal"));
                    }
                    if (fields.containsKey("objectives")) {
                        s.setObjectives((List<String>) fields.get("objectives"));
                    }
                    if (fields.containsKey("todos")) {
                        s.setTodos((List<java.util.Map<String, Object>>) fields.get("todos"));
                    }
                    if (fields.containsKey("flashcards")) {
                        s.setFlashcards((List<java.util.Map<String, Object>>) fields.get("flashcards"));
                    }
                    if (fields.containsKey("courseItems")) {
                        s.setCourseItems((List<java.util.Map<String, Object>>) fields.get("courseItems"));
                    }
                    if (fields.containsKey("attachments")) {
                        s.setAttachments((List<java.util.Map<String, Object>>) fields.get("attachments"));
                    }
                    if (fields.containsKey("actualDurationMinutes")) {
                        Object v = fields.get("actualDurationMinutes");
                        if (v instanceof Number n) {
                            s.setActualDurationMinutes(Math.max(0, n.intValue()));
                        }
                    }
                    if (fields.containsKey("pausedElapsedSeconds")) {
                        Object v = fields.get("pausedElapsedSeconds");
                        if (v instanceof Number n) {
                            s.setPausedElapsedSeconds(Math.max(0, n.intValue()));
                        }
                    }
                    if (fields.containsKey("actualStart")) {
                        Object v = fields.get("actualStart");
                        if (v == null) {
                            s.setActualStart(null);
                        } else if (v instanceof String str && !str.isBlank()) {
                            try {
                                s.setActualStart(LocalDateTime.parse(str));
                            } catch (Exception ex) {
                                s.setActualStart(OffsetDateTime.parse(str).toLocalDateTime());
                            }
                        }
                    }
                    if (fields.containsKey("status")) {
                        Object v = fields.get("status");
                        if (v instanceof String str && !str.isBlank()) {
                            s.setStatus(str);
                        }
                    }
                    // ── Après setStatus, avant save : capturer si on vient de compléter ──
                    if (fields.containsKey("subjectId")) {
                        Object v = fields.get("subjectId");
                        if (v instanceof String str && !str.isBlank()) {
                            s.setSubjectId(str);
                        }
                    }
                    if (fields.containsKey("startTime")) {
                        Object v = fields.get("startTime");
                        if (v instanceof String str && !str.isBlank()) {
                            try {
                                s.setStartTime(LocalDateTime.parse(str.replace("Z","").substring(0, 16)));
                            } catch (Exception ex) {
                                try { s.setStartTime(OffsetDateTime.parse(str).toLocalDateTime()); } catch (Exception ignored) {}
                            }
                        }
                    }
                    if (fields.containsKey("endTime")) {
                        Object v = fields.get("endTime");
                        if (v instanceof String str && !str.isBlank()) {
                            try {
                                s.setEndTime(LocalDateTime.parse(str.replace("Z","").substring(0, 16)));
                            } catch (Exception ex) {
                                try { s.setEndTime(OffsetDateTime.parse(str).toLocalDateTime()); } catch (Exception ignored) {}
                            }
                        }
                    }
                    sessionRepository.save(s);

                    // ── Notification de succès si la session vient d'être terminée ──
                    if (!wasAlreadyCompleted && "completed".equalsIgnoreCase(s.getStatus())) {
                        sendAchievementNotification(userId, s);
                    }
                });
    }

    /** Envoie une notification de succès quand une session est marquée comme terminée. */
    private void sendAchievementNotification(String userId, com.syncstudy.model.StudySession s) {
        String name = (s.getTitle() != null && !s.getTitle().isBlank()) ? s.getTitle() : "Session d'étude";

        // Durée effective
        String durationStr = "—";
        if (s.getActualDurationMinutes() != null && s.getActualDurationMinutes() > 0) {
            int min = s.getActualDurationMinutes();
            durationStr = min >= 60
                    ? (min / 60) + "h" + (min % 60 > 0 ? (min % 60) + "min" : "")
                    : min + " min";
        } else if (s.getStartTime() != null && s.getEndTime() != null) {
            long min = java.time.Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
            durationStr = min >= 60
                    ? (min / 60) + "h" + (min % 60 > 0 ? (min % 60) + "min" : "")
                    : min + " min";
        }

        int objectivesCount = (s.getObjectives() != null) ? s.getObjectives().size() : 0;
        int todosTotal      = (s.getTodos() != null) ? s.getTodos().size() : 0;
        int todosDone       = (s.getTodos() != null)
                ? (int) s.getTodos().stream()
                    .filter(t -> Boolean.TRUE.equals(t.get("done")))
                    .count()
                : 0;

        String details = "Durée de travail : " + durationStr
                + "  ·  Objectifs définis : " + objectivesCount
                + (todosTotal > 0 ? "  ·  Tâches accomplies : " + todosDone + "/" + todosTotal : "");

        notificationService.push(
                userId,
                "achievement",
                "Bravo ! Session « " + name + " » terminée",
                "Vous avez complété votre session d'étude avec succès. Continuez sur cette lancée !",
                details,
                s.getId()
        );
    }

    public void startSession(String userId, String sessionId) {
        StudySession s = sessionRepository.findById(sessionId)
                .filter(x -> userId.equals(x.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
        if (s.getEndTime() != null && s.getEndTime().isBefore(LocalDateTime.now())) {
            s.setStatus("expired");
            sessionRepository.save(s);
            throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Cette session est expirée et ne peut plus être démarrée"
            );
        }
        // Reprendre une session in_progress ou planned : on met à jour actualStart
        // sans effacer pausedElapsedSeconds (le chrono reprend depuis là où il était)
        s.setActualStart(LocalDateTime.now());
        s.setStatus("in_progress");
        sessionRepository.save(s);
    }

    public void stopSession(String userId, String sessionId) {
        StudySession s = sessionRepository.findById(sessionId)
                .filter(x -> userId.equals(x.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
        LocalDateTime now = LocalDateTime.now();
        s.setActualEnd(now);
        s.setStatus("completed");
        if (s.getActualStart() != null) {
            long secs = java.time.Duration.between(s.getActualStart(), now).toSeconds();
            int previousSeconds = s.getPausedElapsedSeconds() != null ? s.getPausedElapsedSeconds() : 0;
            int totalSeconds = (int) Math.max(0, previousSeconds + secs);
            s.setPausedElapsedSeconds(totalSeconds);
            int minutes = totalSeconds > 0 ? Math.max(1, (int) Math.ceil(totalSeconds / 60.0)) : 0;
            s.setActualDurationMinutes(minutes);
        }
        sessionRepository.save(s);
    }

    private List<StudySession> markExpiredSessions(String userId) {
        List<StudySession> all = sessionRepository.findByUserId(userId);
        markExpiredSessionsInList(all);
        return all;
    }

    private void markExpiredSessionsInList(List<StudySession> sessions) {
        if (sessions.isEmpty()) return;
        LocalDateTime now = LocalDateTime.now();
        List<StudySession> changed = new ArrayList<>();
        for (StudySession s : sessions) {
            if (s.getEndTime() == null) continue;
            if ("completed".equalsIgnoreCase(s.getStatus())) continue;
            if ("expired".equalsIgnoreCase(s.getStatus())) continue;
            if (s.getEndTime().isBefore(now)) {
                s.setStatus("expired");
                changed.add(s);
            }
        }
        if (!changed.isEmpty()) {
            sessionRepository.saveAll(changed);
        }
    }
}
