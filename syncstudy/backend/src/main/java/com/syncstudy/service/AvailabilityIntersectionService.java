package com.syncstudy.service;

import com.syncstudy.model.Availability;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service utilitaire — calcul de l'intersection des disponibilités entre membres.
 *
 * Isolé ici pour être réutilisable (planning, suggestions de créneaux, etc.)
 * sans coupler la logique à SessionService ou à d'autres services métier.
 *
 * Convention dayOfWeek utilisée dans l'appli : 0 = Dimanche, 1 = Lundi … 6 = Samedi
 * (identique à JavaScript Date.getDay()).
 */
@Service
public class AvailabilityIntersectionService {

    /**
     * Calcule les créneaux horaires communs à TOUS les membres pour un jour donné.
     *
     * Algorithme :
     *   1. Pour chaque membre, extraire ses créneaux du jour concerné.
     *   2. Si un membre n'a aucun créneau ce jour → résultat vide immédiatement.
     *   3. Intersecter itérativement : common = intersect(common, slotsN).
     *      Chaque intersection [a,b] ∩ [c,d] = [max(a,c), min(b,d)] si non vide.
     *
     * @param memberAvailabilities une liste par membre de ses disponibilités
     * @param dayOfWeek            jour de la semaine (0=Dim … 6=Sam)
     * @return liste de paires {startTime, endTime} couvrant les plages communes ;
     *         liste vide si aucune disponibilité commune
     */
    public List<LocalTime[]> computeCommonSlots(
            List<List<Availability>> memberAvailabilities,
            int dayOfWeek
    ) {
        if (memberAvailabilities == null || memberAvailabilities.isEmpty()) {
            return List.of();
        }

        // --- Étape 1 : extraire les créneaux de chaque membre pour ce jour ---
        List<List<LocalTime[]>> allMemberSlots = memberAvailabilities.stream()
                .map(avails -> avails.stream()
                        .filter(a -> a.getDayOfWeek() == dayOfWeek)
                        .map(a -> new LocalTime[]{
                                LocalTime.parse(a.getStartTime()),
                                LocalTime.parse(a.getEndTime())
                        })
                        .sorted(Comparator.comparing(s -> s[0]))
                        .collect(Collectors.toList()))
                .collect(Collectors.toList());

        // --- Étape 2 : court-circuit si un membre est vide ce jour-là ---
        if (allMemberSlots.stream().anyMatch(List::isEmpty)) {
            return List.of();
        }

        // --- Étape 3 : intersection itérative ---
        List<LocalTime[]> common = new ArrayList<>(allMemberSlots.get(0));

        for (int i = 1; i < allMemberSlots.size(); i++) {
            common = intersectIntervals(common, allMemberSlots.get(i));
            if (common.isEmpty()) {
                return List.of(); // plus aucune intersection possible
            }
        }

        return common;
    }

    /**
     * Vérifie que le créneau demandé [reqStart, reqEnd] est entièrement contenu
     * dans l'un des créneaux communs calculés par {@link #computeCommonSlots}.
     *
     * @param reqStart    heure de début souhaitée
     * @param reqEnd      heure de fin souhaitée
     * @param commonSlots créneaux communs (résultat de computeCommonSlots)
     * @return {@code true} si le créneau est couvert par au moins un créneau commun
     */
    public boolean isSlotCoveredByCommon(
            LocalTime reqStart,
            LocalTime reqEnd,
            List<LocalTime[]> commonSlots
    ) {
        return commonSlots.stream().anyMatch(slot ->
                !reqStart.isBefore(slot[0]) && !reqEnd.isAfter(slot[1])
        );
    }

    /**
     * BONUS — Retourne le créneau commun le plus long parmi ceux disponibles.
     *
     * Utile pour suggérer un horaire alternatif dans la notification envoyée
     * aux membres lorsque le créneau demandé ne couvre pas tous les membres.
     *
     * @param commonSlots créneaux communs (peut être vide)
     * @return le créneau le plus long, ou {@code Optional.empty()} si la liste est vide
     */
    public Optional<LocalTime[]> findLongestCommonSlot(List<LocalTime[]> commonSlots) {
        return commonSlots.stream()
                .max(Comparator.comparingLong(slot ->
                        Duration.between(slot[0], slot[1]).toMinutes()));
    }

    // ── Méthode privée ──────────────────────────────────────────────────────

    /**
     * Intersection de deux listes d'intervalles (produit cartésien des paires).
     * Pour chaque paire (ia, ib) : résultat = [max(ia[0], ib[0]), min(ia[1], ib[1])]
     * conservé uniquement si start < end.
     */
    private List<LocalTime[]> intersectIntervals(
            List<LocalTime[]> slotsA,
            List<LocalTime[]> slotsB
    ) {
        List<LocalTime[]> result = new ArrayList<>();
        for (LocalTime[] ia : slotsA) {
            for (LocalTime[] ib : slotsB) {
                // Début = maximum des deux débuts
                LocalTime start = ia[0].isAfter(ib[0]) ? ia[0] : ib[0];
                // Fin   = minimum des deux fins
                LocalTime end   = ia[1].isBefore(ib[1]) ? ia[1] : ib[1];
                // Conserver uniquement si l'intersection est non vide (start < end)
                if (start.isBefore(end)) {
                    result.add(new LocalTime[]{ start, end });
                }
            }
        }
        return result;
    }
}
