package com.syncstudy.repository;

import com.syncstudy.model.SessionNote;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SessionNoteRepository extends MongoRepository<SessionNote, String> {
    List<SessionNote> findByChatRoomKeyOrderByCreatedAtAsc(String chatRoomKey);
    void deleteByChatRoomKey(String chatRoomKey);
}
