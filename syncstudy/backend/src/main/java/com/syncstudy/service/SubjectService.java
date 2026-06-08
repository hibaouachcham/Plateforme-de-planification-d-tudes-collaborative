package com.syncstudy.service;

import com.syncstudy.dto.request.CreateSubjectRequest;
import com.syncstudy.model.Subject;
import com.syncstudy.repository.SubjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class SubjectService {
    private final SubjectRepository subjectRepository;

    public SubjectService(SubjectRepository subjectRepository) {
        this.subjectRepository = subjectRepository;
    }

    public List<Subject> getSubjectsByUser(String userId) {
        return subjectRepository.findByUserId(userId);
    }

    public Subject createSubject(String userId, CreateSubjectRequest req) {
        Subject subject = Subject.builder()
                .userId(userId)
                .name(req.getName())
                .color(req.getColor())
                .priority(req.getPriority())
                .weeklyGoalHours(req.getWeeklyGoalHours())
                .studyType(req.getStudyType())
                .workMode(req.getWorkMode())
                .minSessionMin(req.getMinSessionMin())
                .maxSessionMin(req.getMaxSessionMin())
                .build();
        return subjectRepository.save(subject);
    }

    public Subject updateSubject(String userId, String subjectId, CreateSubjectRequest req) {
        Subject subject = subjectRepository.findById(subjectId)
                .filter(s -> userId.equals(s.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Subject not found"));
        subject.setName(req.getName());
        subject.setColor(req.getColor());
        subject.setPriority(req.getPriority());
        subject.setWeeklyGoalHours(req.getWeeklyGoalHours());
        subject.setStudyType(req.getStudyType());
        subject.setWorkMode(req.getWorkMode());
        subject.setMinSessionMin(req.getMinSessionMin());
        subject.setMaxSessionMin(req.getMaxSessionMin());
        return subjectRepository.save(subject);
    }

    public void deleteSubject(String userId, String subjectId) {
        subjectRepository.deleteByIdAndUserId(subjectId, userId);
    }
}
