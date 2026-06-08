package com.syncstudy.repository;

import com.syncstudy.model.StudyGroup;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StudyGroupRepository extends MongoRepository<StudyGroup, String> {
    List<StudyGroup> findByMemberIdsContaining(String userId);
    Optional<StudyGroup> findByInviteCode(String inviteCode);
}
