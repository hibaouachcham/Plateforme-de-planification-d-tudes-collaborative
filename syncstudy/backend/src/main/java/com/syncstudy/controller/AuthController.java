package com.syncstudy.controller;

import com.syncstudy.dto.request.ForgotPasswordRequest;
import com.syncstudy.dto.request.LoginRequest;
import com.syncstudy.dto.request.RegisterRequest;
import com.syncstudy.dto.request.ResetPasswordRequest;
import com.syncstudy.dto.response.AuthResponse;
import com.syncstudy.security.RateLimiterService;
import com.syncstudy.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService       authService;
    private final RateLimiterService rateLimiter;

    public AuthController(AuthService authService, RateLimiterService rateLimiter) {
        this.authService  = authService;
        this.rateLimiter  = rateLimiter;
    }

    // ── Register ─────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest req,
            HttpServletRequest request,
            HttpServletResponse response) {

        String ip = RateLimiterService.extractIp(request);
        if (!rateLimiter.isAllowed("register:" + ip, RateLimiterService.REGISTER_MAX)) {
            return ResponseEntity.status(429).build();
        }

        AuthResponse auth = authService.register(req);
        addRefreshCookie(response, auth.getRefreshToken());
        // Ne pas exposer le refresh token dans le corps de la réponse
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(auth.getAccessToken())
                .user(auth.getUser())
                .build());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest request,
            HttpServletResponse response) {

        String ip = RateLimiterService.extractIp(request);
        if (!rateLimiter.isAllowed("login:" + ip, RateLimiterService.LOGIN_MAX)) {
            return ResponseEntity.status(429).build();
        }

        AuthResponse auth = authService.login(req);
        // Refresh token → cookie HttpOnly (inaccessible au JavaScript)
        addRefreshCookie(response, auth.getRefreshToken());
        // Access token uniquement dans le corps (stocké en mémoire côté client)
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(auth.getAccessToken())
                .user(auth.getUser())
                .build());
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String cookieToken,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletResponse response) {

        // Accepte le token depuis le cookie OU (rétrocompat.) depuis le corps
        String token = cookieToken != null ? cookieToken
                : (body != null ? body.get("refreshToken") : null);
        if (token != null) {
            authService.logout(token);
        }
        clearRefreshCookie(response);
        return ResponseEntity.ok().build();
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String cookieToken,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletResponse response) {

        // Accepte le token depuis le cookie OU (rétrocompat.) depuis le corps
        String token = cookieToken != null ? cookieToken
                : (body != null ? body.get("refreshToken") : null);
        if (token == null) {
            return ResponseEntity.status(401).build();
        }

        AuthResponse auth = authService.refresh(token);
        addRefreshCookie(response, auth.getRefreshToken());
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(auth.getAccessToken())
                .user(auth.getUser())
                .build());
    }

    // ── Mot de passe oublié ───────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest req,
            HttpServletRequest request) {

        String ip = RateLimiterService.extractIp(request);
        if (!rateLimiter.isAllowed("forgot:" + ip, RateLimiterService.FORGOT_MAX)) {
            return ResponseEntity.status(429).build();
        }

        authService.forgotPassword(req.getEmail());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.getToken(), req.getNewPassword());
        return ResponseEntity.ok().build();
    }

    /** Retourne l'indice mémo (hint) — toujours 200 même si l'email n'existe pas (anti-énumération). */
    @GetMapping("/password-hint")
    public ResponseEntity<Map<String, String>> passwordHint(@RequestParam String email) {
        String hint = authService.getPasswordHint(email);
        // Retourne "" si le compte n'existe pas — ne révèle pas l'existence du compte
        return ResponseEntity.ok(Map.of("hint", hint == null ? "" : hint));
    }

    /** Réinitialisation directe : email + nouveau mot de passe + indice mémo. */
    @PostMapping("/reset-password-direct")
    public ResponseEntity<Void> resetPasswordDirect(@RequestBody Map<String, String> body) {
        if (body == null) return ResponseEntity.badRequest().build();
        authService.resetPasswordDirect(
                body.get("email"),
                body.get("newPassword"),
                body.getOrDefault("hint", "")
        );
        return ResponseEntity.ok().build();
    }

    // ── Helpers cookies ───────────────────────────────────────────────────────

    /**
     * Crée un cookie HttpOnly pour le refresh token.
     *
     * Attributs de sécurité :
     *   - HttpOnly      : inaccessible au JavaScript (protection XSS)
     *   - SameSite=Lax  : envoyé uniquement pour les requêtes same-origin (protection CSRF)
     *   - Path=/api/auth: envoyé uniquement vers /api/auth/* (surface minimale)
     *                     IMPORTANT : doit inclure le context-path "/api" sinon le navigateur
     *                     ne l'envoie pas sur POST /api/auth/refresh.
     *   - Secure        : à activer en production (HTTPS uniquement)
     */
    private void addRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(false)          // Mettre à true en production (HTTPS)
                .sameSite("Lax")
                .path("/api/auth")      // Inclure le context-path pour que le navigateur envoie le cookie
                .maxAge(Duration.ofDays(7))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /** Efface le cookie refresh_token (maxAge=0). */
    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/auth")      // Même path que lors de la création
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
