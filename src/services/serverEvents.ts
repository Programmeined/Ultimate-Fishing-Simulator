import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { ServerEvent, ServerEventBonusType } from '../game/types';

const VALID_BONUS_TYPES: ServerEventBonusType[] = [
  'xp_boost',
  'money_boost',
  'activity_boost',
  'rare_fish',
  'luck_boost',
  'all_boost',
];

function parseServerEvent(id: string, data: Record<string, unknown>): ServerEvent | null {
  if (
    typeof data.title !== 'string' ||
    typeof data.description !== 'string' ||
    typeof data.bonusType !== 'string' ||
    !VALID_BONUS_TYPES.includes(data.bonusType as ServerEventBonusType) ||
    typeof data.locationId !== 'string' ||
    typeof data.active !== 'boolean' ||
    typeof data.startsAt !== 'string' ||
    typeof data.endsAt !== 'string' ||
    typeof data.createdByUid !== 'string'
  ) {
    return null;
  }

  return {
    id,
    title: data.title,
    description: data.description,
    bonusType: data.bonusType as ServerEventBonusType,
    locationId: data.locationId,
    active: data.active,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    createdByUid: data.createdByUid,
    createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
  };
}

function sortByStartDesc(events: ServerEvent[]): ServerEvent[] {
  return [...events].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
}

export function subscribeActiveServerEvents(
  onData: (events: ServerEvent[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'server_events'), where('active', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const parsed: ServerEvent[] = [];
      snapshot.forEach((docSnap) => {
        const evt = parseServerEvent(docSnap.id, docSnap.data() as Record<string, unknown>);
        if (evt) parsed.push(evt);
      });
      onData(sortByStartDesc(parsed));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'server_events');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(err)));
      }
    }
  );
}

export function subscribeAllServerEvents(
  onData: (events: ServerEvent[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'server_events');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const parsed: ServerEvent[] = [];
      snapshot.forEach((docSnap) => {
        const evt = parseServerEvent(docSnap.id, docSnap.data() as Record<string, unknown>);
        if (evt) parsed.push(evt);
      });
      onData(sortByStartDesc(parsed));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'server_events');
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(err)));
      }
    }
  );
}

export interface CreateServerEventInput {
  title: string;
  description: string;
  bonusType: ServerEventBonusType;
  locationId: string;
  durationHours: number;
}

export async function createServerEvent(
  input: CreateServerEventInput,
  user: User
): Promise<string> {
  const title = input.title.trim().slice(0, 60);
  if (title.length < 3) {
    throw new Error('Der Event-Titel muss mindestens 3 Zeichen lang sein.');
  }

  const description = input.description.trim().slice(0, 240);
  const bonusType = VALID_BONUS_TYPES.includes(input.bonusType) ? input.bonusType : 'xp_boost';
  const rawLocation = input.locationId.trim().toLowerCase();
  const locationId = /^[a-z0-9_-]{2,32}$/.test(rawLocation) ? rawLocation : 'all';
  const durationHours = Math.max(1, Math.min(168, Math.round(input.durationHours || 24)));

  const now = new Date();
  const endsAt = new Date(now.getTime() + durationHours * 3600 * 1000);
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Avoid storing email addresses as PII in public event documents
  const safeDisplayName =
    user.displayName && !user.displayName.includes('@')
      ? user.displayName.trim().slice(0, 60)
      : 'Server-Admin';

  try {
    await setDoc(doc(db, 'server_events', eventId), {
      title,
      description,
      bonusType,
      locationId,
      active: true,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      createdByUid: user.uid,
      createdByName: safeDisplayName || 'Server-Admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return eventId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `server_events/${eventId}`);
  }
}

export async function toggleServerEventActive(
  eventId: string,
  active: boolean
): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) {
    throw new Error('Ungültige Event-ID.');
  }
  try {
    await updateDoc(doc(db, 'server_events', eventId), {
      active,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `server_events/${eventId}`);
  }
}

export async function deleteServerEvent(eventId: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) {
    throw new Error('Ungültige Event-ID.');
  }
  try {
    await deleteDoc(doc(db, 'server_events', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `server_events/${eventId}`);
  }
}
