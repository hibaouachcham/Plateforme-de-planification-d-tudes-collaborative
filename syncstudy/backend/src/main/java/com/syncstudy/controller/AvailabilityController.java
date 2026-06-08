package com.syncstudy.controller;

import com.syncstudy.dto.request.CreateAvailabilityRequest;
import com.syncstudy.model.Availability;
import com.syncstudy.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/availabilities")
@PreAuthorize("isAuthenticated()")
public class AvailabilityController {
    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping
    public ResponseEntity<List<Availability>> list(Authentication authentication) {
        return ResponseEntity.ok(availabilityService.getAvailabilitiesByUser(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<List<Availability>> save(Authentication authentication, @RequestBody List<Availability> req) {
        return ResponseEntity.ok(availabilityService.saveAvailabilitiesRaw(authentication.getName(), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable String id) {
        availabilityService.deleteAvailability(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }
}
