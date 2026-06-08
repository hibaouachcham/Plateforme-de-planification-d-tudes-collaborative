package com.syncstudy.controller;

import com.syncstudy.dto.response.UserResponse;
import com.syncstudy.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    /** KPIs globaux — CDC §4.1.2 */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    /** Crée un utilisateur depuis l'espace admin. */
    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(201).body(adminService.createUser(body));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(adminService.listUsers(page, size).getContent());
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        adminService.toggleStatus(id, body.getOrDefault("status", "active"));
        return ResponseEntity.ok().build();
    }

    /** Supprime définitivement un utilisateur (hors admin). */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /** Réinitialise le mot de passe d'un utilisateur par son ID. */
    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable String id) {
        adminService.sendResetPassword(id);
        return ResponseEntity.ok().build();
    }

    /** Réinitialise le mot de passe d'un utilisateur par son email. */
    @PostMapping("/users/reset-password")
    public ResponseEntity<Void> resetPasswordByEmail(@RequestBody Map<String, String> body) {
        adminService.sendResetPasswordByEmail(body.getOrDefault("email", ""));
        return ResponseEntity.ok().build();
    }
}
