export interface GroupMember {
  id: string;
  name: string;
  role: 'Propriétaire' | 'Membre';
}

export interface Group {
  id: string;
  name: string;
  members: number;
  colorClass: string;
  lastActive: string;
  description: string;
  isJoined: boolean;
  /** Code d’invitation unique (CDC §4.3.1) */
  inviteCode: string;
  /** Créateur / propriétaire */
  ownerId: string;
  /** Membres réels renvoyés par l'API */
  memberDetails?: GroupMember[];
  /** Tâches / objectifs du groupe */
  tasks?: GroupTask[];
}

export interface GroupTask {
  id: string;
  text: string;
  done: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}
