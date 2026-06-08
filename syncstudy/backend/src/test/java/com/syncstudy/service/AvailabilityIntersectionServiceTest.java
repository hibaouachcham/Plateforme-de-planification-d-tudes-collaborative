package com.syncstudy.service;

import com.syncstudy.model.Availability;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires pour {@link AvailabilityIntersectionService}.
 *
 * Ce service est pur (pas de dépendances Spring / repos) →
 * on l'instancie directement, sans Mockito ni contexte Spring.
 */
class AvailabilityIntersectionServiceTest {

    private AvailabilityIntersectionService service;

    @BeforeEach
    void setUp() {
        service = new AvailabilityIntersectionService();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Crée une Availability minimale pour les tests. */
    private Availability avail(int dayOfWeek, String start, String end) {
        Availability a = new Availability();
        a.setDayOfWeek(dayOfWeek);
        a.setStartTime(start);
        a.setEndTime(end);
        return a;
    }

    // ── computeCommonSlots ───────────────────────────────────────────────────

    @Nested
    @DisplayName("computeCommonSlots()")
    class ComputeCommonSlots {

        @Test
        @DisplayName("Deux membres avec chevauchement partiel → retourne l'intersection")
        void twoMembers_partialOverlap_returnsIntersection() {
            // Membre A : lundi 08h-12h
            List<Availability> memberA = List.of(avail(1, "08:00", "12:00"));
            // Membre B : lundi 10h-14h
            List<Availability> memberB = List.of(avail(1, "10:00", "14:00"));

            List<LocalTime[]> common = service.computeCommonSlots(
                    List.of(memberA, memberB), 1 /* lundi */);

            assertThat(common).hasSize(1);
            assertThat(common.get(0)[0]).isEqualTo(LocalTime.of(10, 0));
            assertThat(common.get(0)[1]).isEqualTo(LocalTime.of(12, 0));
        }

        @Test
        @DisplayName("Deux membres sans chevauchement → retourne liste vide")
        void twoMembers_noOverlap_returnsEmpty() {
            List<Availability> memberA = List.of(avail(1, "08:00", "10:00"));
            List<Availability> memberB = List.of(avail(1, "11:00", "13:00"));

            List<LocalTime[]> common = service.computeCommonSlots(
                    List.of(memberA, memberB), 1);

            assertThat(common).isEmpty();
        }

        @Test
        @DisplayName("Un membre sans disponibilité ce jour → retourne liste vide")
        void oneMemberHasNoAvailabilityOnDay_returnsEmpty() {
            // Membre A disponible lundi, Membre B seulement mardi
            List<Availability> memberA = List.of(avail(1, "09:00", "12:00"));
            List<Availability> memberB = List.of(avail(2, "09:00", "12:00")); // mardi ≠ lundi

            List<LocalTime[]> common = service.computeCommonSlots(
                    List.of(memberA, memberB), 1 /* lundi */);

            assertThat(common).isEmpty();
        }

        @Test
        @DisplayName("Liste de membres vide → retourne liste vide")
        void emptyMemberList_returnsEmpty() {
            List<LocalTime[]> common = service.computeCommonSlots(List.of(), 1);
            assertThat(common).isEmpty();
        }

        @Test
        @DisplayName("Membre unique → retourne ses propres créneaux")
        void singleMember_returnsOwnSlots() {
            List<Availability> memberA = List.of(avail(3, "14:00", "18:00"));

            List<LocalTime[]> common = service.computeCommonSlots(
                    List.of(memberA), 3 /* mercredi */);

            assertThat(common).hasSize(1);
            assertThat(common.get(0)[0]).isEqualTo(LocalTime.of(14, 0));
            assertThat(common.get(0)[1]).isEqualTo(LocalTime.of(18, 0));
        }

        @Test
        @DisplayName("Trois membres avec intersection commune → retourne la plage commune à tous")
        void threeMembers_commonIntersection_returnsCommon() {
            // A: 08h-16h, B: 10h-14h, C: 11h-15h → commun : 11h-14h
            List<Availability> a = List.of(avail(1, "08:00", "16:00"));
            List<Availability> b = List.of(avail(1, "10:00", "14:00"));
            List<Availability> c = List.of(avail(1, "11:00", "15:00"));

            List<LocalTime[]> common = service.computeCommonSlots(List.of(a, b, c), 1);

            assertThat(common).hasSize(1);
            assertThat(common.get(0)[0]).isEqualTo(LocalTime.of(11, 0));
            assertThat(common.get(0)[1]).isEqualTo(LocalTime.of(14, 0));
        }

        @Test
        @DisplayName("Créneaux adjacents (fin == début de l'autre) → pas d'intersection")
        void adjacentSlots_noOverlap() {
            List<Availability> memberA = List.of(avail(1, "08:00", "10:00"));
            List<Availability> memberB = List.of(avail(1, "10:00", "12:00")); // commence exactement quand A finit

            List<LocalTime[]> common = service.computeCommonSlots(
                    List.of(memberA, memberB), 1);

            // start < end est requis → 10:00 < 10:00 est faux → vide
            assertThat(common).isEmpty();
        }
    }

    // ── isSlotCoveredByCommon ────────────────────────────────────────────────

    @Nested
    @DisplayName("isSlotCoveredByCommon()")
    class IsSlotCoveredByCommon {

        private final List<LocalTime[]> commonSlots = List.<LocalTime[]>of(
                new LocalTime[]{LocalTime.of(10, 0), LocalTime.of(14, 0)}
        );

        @Test
        @DisplayName("Créneau entièrement inclus → true")
        void slotFullyCovered_returnsTrue() {
            boolean result = service.isSlotCoveredByCommon(
                    LocalTime.of(11, 0), LocalTime.of(13, 0), commonSlots);
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Créneau exactement égal au créneau commun → true")
        void slotExactlyEqual_returnsTrue() {
            boolean result = service.isSlotCoveredByCommon(
                    LocalTime.of(10, 0), LocalTime.of(14, 0), commonSlots);
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Créneau débordant sur la fin → false")
        void slotOverflowsEnd_returnsFalse() {
            boolean result = service.isSlotCoveredByCommon(
                    LocalTime.of(12, 0), LocalTime.of(15, 0), commonSlots);
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Créneau débordant sur le début → false")
        void slotOverflowsStart_returnsFalse() {
            boolean result = service.isSlotCoveredByCommon(
                    LocalTime.of(9, 0), LocalTime.of(12, 0), commonSlots);
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Liste de créneaux communs vide → false")
        void emptyCommonSlots_returnsFalse() {
            boolean result = service.isSlotCoveredByCommon(
                    LocalTime.of(10, 0), LocalTime.of(12, 0), List.of());
            assertThat(result).isFalse();
        }
    }

    // ── findLongestCommonSlot ────────────────────────────────────────────────

    @Nested
    @DisplayName("findLongestCommonSlot()")
    class FindLongestCommonSlot {

        @Test
        @DisplayName("Plusieurs créneaux → retourne le plus long")
        void multipleSlotsReturnsLongest() {
            List<LocalTime[]> slots = List.of(
                    new LocalTime[]{LocalTime.of(8, 0),  LocalTime.of(9, 0)},   // 1h
                    new LocalTime[]{LocalTime.of(10, 0), LocalTime.of(13, 0)},  // 3h ← le plus long
                    new LocalTime[]{LocalTime.of(14, 0), LocalTime.of(15, 30)}  // 1h30
            );

            Optional<LocalTime[]> longest = service.findLongestCommonSlot(slots);

            assertThat(longest).isPresent();
            assertThat(longest.get()[0]).isEqualTo(LocalTime.of(10, 0));
            assertThat(longest.get()[1]).isEqualTo(LocalTime.of(13, 0));
        }

        @Test
        @DisplayName("Un seul créneau → retourne ce créneau")
        void singleSlot_returnsThatSlot() {
            List<LocalTime[]> slots = List.<LocalTime[]>of(
                    new LocalTime[]{LocalTime.of(9, 0), LocalTime.of(11, 0)}
            );

            Optional<LocalTime[]> result = service.findLongestCommonSlot(slots);

            assertThat(result).isPresent();
            assertThat(result.get()[0]).isEqualTo(LocalTime.of(9, 0));
        }

        @Test
        @DisplayName("Liste vide → Optional vide")
        void emptyList_returnsEmpty() {
            Optional<LocalTime[]> result = service.findLongestCommonSlot(List.of());
            assertThat(result).isEmpty();
        }
    }
}
