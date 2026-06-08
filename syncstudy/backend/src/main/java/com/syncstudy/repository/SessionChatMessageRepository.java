package com.syncstudy.repository;

import com.syncstudy.model.SessionChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SessionChatMessageRepository extends MongoRepository<SessionChatMessage, String> {
    /** Récupère les 100 derniers messages d'une room de chat (triés par date) */
    List<SessionChatMessage> findTop100ByChatRoomKeyOrderBySentAtAsc(String chatRoomKey);

    /** Supprime tous les messages d'une room */
    void deleteByChatRoomKey(String chatRoomKey);
}
