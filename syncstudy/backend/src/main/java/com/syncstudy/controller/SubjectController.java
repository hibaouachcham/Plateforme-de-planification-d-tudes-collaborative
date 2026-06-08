package com.syncstudy.controller;

import com.syncstudy.dto.request.CreateSubjectRequest;
import com.syncstudy.model.Subject;
import com.syncstudy.service.SubjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/subjects")
@PreAuthorize("isAuthenticated()")
public class SubjectController {
    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GetMapping
    public ResponseEntity<List<Subject>> list(Authentication authentication) {
        return ResponseEntity.ok(subjectService.getSubjectsByUser(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<Subject> create(Authentication authentication, @Valid @RequestBody CreateSubjectRequest req) {
        return ResponseEntity.ok(subjectService.createSubject(authentication.getName(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subject> update(Authentication authentication, @PathVariable String id, @Valid @RequestBody CreateSubjectRequest req) {
        return ResponseEntity.ok(subjectService.updateSubject(authentication.getName(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable String id) {
        subjectService.deleteSubject(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }
}
