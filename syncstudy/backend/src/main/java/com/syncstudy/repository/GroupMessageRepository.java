package com.syncstudy.repository;

import com.syncstudy.model.GroupMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GroupMessageRepository extends MongoRepository<GroupMessage, String> {
    List<GroupMessage> findByGroupIdOrderBySentAtAsc(String groupId);
    void deleteByGroupId(String groupId);
}
