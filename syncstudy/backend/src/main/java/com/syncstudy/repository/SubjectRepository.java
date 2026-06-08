package com.syncstudy.repository;

import com.syncstudy.model.Subject;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SubjectRepository extends MongoRepository<Subject, String> {
    List<Subject> findByUserId(String userId);
    void deleteByIdAndUserId(String id, String userId);
}
