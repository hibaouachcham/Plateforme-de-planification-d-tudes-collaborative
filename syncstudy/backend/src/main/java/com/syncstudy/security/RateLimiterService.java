package com.syncstudy.security;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter en mémoire basé sur une fenêtre glissante.
 *
 * Utilisé pour protéger les endpoints d'authentification contre
 * le brute-force et les attaques par déni de service (DoS).
 *
 * Limites par défaut :
 *   - /auth/login          → 10 tentatives / minute par IP
 *   - /auth/register       → 5  tentatives / minute par IP
 *   - /auth/forgot-password → 3  tentatives / minute par IP
 *
 * Limites configurées via les constantes publiques ci-dessous.
 *
 * Note : solution in-memory, adaptée à une instance unique.
 * Pour un déploiement multi-instances, utiliser Redis + Bucket4j.
 */
@Service
public class RateLimiterService {

    /** Fenêtre de temps en millisecondes (1 minute). */
    private static final long WINDOW_MS = 60_000L;

    /** Nombre max de tentatives pour /auth/login par fenêtre. */
    public static final int LOGIN_MAX    = 10;

    /** Nombre max de tentatives pour /auth/register par fenêtre. */
    public static final int REGISTER_MAX = 5;

    /** Nombre max de tentatives pour /auth/forgot-password par fenêtre. */
    public static final int FORGOT_MAX   = 3;

    /** Stockage : clé = "action:ip", valeur = timestamps des tentatives. */
    private final ConcurrentHashMap<String, List<Long>> attempts = new ConcurrentHashMap<>();

    /**
     * Vérifie si la clé donnée est autorisée à effectuer une nouvelle tentative.
     *
     * @param key       clé unique de la forme "action:ip" (ex: "login:192.168.1.1")
     * @param maxCalls  nombre maximum autorisé sur la fenêtre glissante
     * @return true si autorisé, false si la limite est dépassée
     */
    public boolean isAllowed(String key, int maxCalls) {
        long now = System.currentTimeMillis();
        attempts.compute(key, (k, list) -> {
            if (list == null) list = new ArrayList<>();
            // Supprimer les tentatives hors de la fenêtre glissante
            list.removeIf(t -> now - t > WINDOW_MS);
            list.add(now);
            return list;
        });
        List<Long> list = attempts.get(key);
        return list == null || list.size() <= maxCalls;
    }

    /**
     * Extrait l'adresse IP réelle du client, en tenant compte des proxys.
     *
     * @param request la requête HTTP entrante
     * @return l'adresse IP sous forme de chaîne
     */
    public static String extractIp(jakarta.servlet.http.HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For peut contenir plusieurs IPs : prendre la première
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
