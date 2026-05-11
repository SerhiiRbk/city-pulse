import { describe, it, expect } from 'vitest';
import {
  classifyEvents,
  classifyCrewSuccession,
  classifyGroupSuccession,
  type ClassifiableEvent,
  type ClassifiableCrew,
  type ClassifiableGroup,
} from '@/lib/deletion/classification';

describe('classifyEvents', () => {
  const now = new Date('2025-06-15T12:00:00Z');

  it('classifies future published events as transfer', () => {
    const events: ClassifiableEvent[] = [
      { id: 'e1', status: 'published', ends_at: '2025-07-01T18:00:00Z' },
    ];
    const result = classifyEvents(events, now);
    expect(result.transfer).toHaveLength(1);
    expect(result.transfer[0].id).toBe('e1');
    expect(result.delete).toHaveLength(0);
    expect(result.retain).toHaveLength(0);
  });

  it('classifies future draft events as delete', () => {
    const events: ClassifiableEvent[] = [
      { id: 'e2', status: 'draft', ends_at: '2025-07-01T18:00:00Z' },
    ];
    const result = classifyEvents(events, now);
    expect(result.delete).toHaveLength(1);
    expect(result.delete[0].id).toBe('e2');
    expect(result.transfer).toHaveLength(0);
    expect(result.retain).toHaveLength(0);
  });

  it('classifies past events as retain', () => {
    const events: ClassifiableEvent[] = [
      { id: 'e3', status: 'published', ends_at: '2025-06-01T18:00:00Z' },
    ];
    const result = classifyEvents(events, now);
    expect(result.retain).toHaveLength(1);
    expect(result.retain[0].id).toBe('e3');
    expect(result.transfer).toHaveLength(0);
    expect(result.delete).toHaveLength(0);
  });

  it('classifies cancelled events as retain regardless of timing', () => {
    const events: ClassifiableEvent[] = [
      { id: 'e4', status: 'cancelled', ends_at: '2025-07-01T18:00:00Z' },
      { id: 'e5', status: 'cancelled', ends_at: '2025-01-01T18:00:00Z' },
    ];
    const result = classifyEvents(events, now);
    expect(result.retain).toHaveLength(2);
    expect(result.transfer).toHaveLength(0);
    expect(result.delete).toHaveLength(0);
  });

  it('classifies events exactly at now as retain (ends_at <= now)', () => {
    const events: ClassifiableEvent[] = [
      { id: 'e6', status: 'published', ends_at: '2025-06-15T12:00:00Z' },
    ];
    const result = classifyEvents(events, now);
    expect(result.retain).toHaveLength(1);
  });

  it('handles mixed event sets correctly', () => {
    const events: ClassifiableEvent[] = [
      { id: 'e1', status: 'published', ends_at: '2025-07-01T18:00:00Z' }, // transfer
      { id: 'e2', status: 'draft', ends_at: '2025-07-01T18:00:00Z' }, // delete
      { id: 'e3', status: 'published', ends_at: '2025-06-01T18:00:00Z' }, // retain
      { id: 'e4', status: 'cancelled', ends_at: '2025-07-01T18:00:00Z' }, // retain
    ];
    const result = classifyEvents(events, now);
    expect(result.transfer).toHaveLength(1);
    expect(result.delete).toHaveLength(1);
    expect(result.retain).toHaveLength(2);
  });

  it('handles empty event list', () => {
    const result = classifyEvents([], now);
    expect(result.transfer).toHaveLength(0);
    expect(result.delete).toHaveLength(0);
    expect(result.retain).toHaveLength(0);
  });
});

describe('classifyCrewSuccession', () => {
  it('promotes earliest moderator when moderators exist', () => {
    const crew: ClassifiableCrew = {
      id: 'crew1',
      members: [
        { user_id: 'u1', role: 'moderator', joined_at: '2025-03-01T00:00:00Z' },
        { user_id: 'u2', role: 'moderator', joined_at: '2025-01-01T00:00:00Z' },
        { user_id: 'u3', role: 'member', joined_at: '2024-12-01T00:00:00Z' },
      ],
    };
    const result = classifyCrewSuccession(crew);
    expect(result.type).toBe('promote_moderator');
    if (result.type === 'promote_moderator') {
      expect(result.moderator.user_id).toBe('u2');
    }
  });

  it('marks crew for deletion when no moderators exist', () => {
    const crew: ClassifiableCrew = {
      id: 'crew2',
      members: [
        { user_id: 'u1', role: 'member', joined_at: '2025-01-01T00:00:00Z' },
        { user_id: 'u2', role: 'member', joined_at: '2025-02-01T00:00:00Z' },
      ],
    };
    const result = classifyCrewSuccession(crew);
    expect(result.type).toBe('delete_crew');
  });

  it('marks crew for deletion when no members at all', () => {
    const crew: ClassifiableCrew = {
      id: 'crew3',
      members: [],
    };
    const result = classifyCrewSuccession(crew);
    expect(result.type).toBe('delete_crew');
  });

  it('promotes single moderator when only one exists', () => {
    const crew: ClassifiableCrew = {
      id: 'crew4',
      members: [
        { user_id: 'u1', role: 'moderator', joined_at: '2025-01-15T00:00:00Z' },
      ],
    };
    const result = classifyCrewSuccession(crew);
    expect(result.type).toBe('promote_moderator');
    if (result.type === 'promote_moderator') {
      expect(result.moderator.user_id).toBe('u1');
    }
  });
});

describe('classifyGroupSuccession', () => {
  it('promotes earliest moderator when moderators exist', () => {
    const group: ClassifiableGroup = {
      id: 'group1',
      members: [
        { user_id: 'u1', role: 'moderator', joined_at: '2025-03-01T00:00:00Z' },
        { user_id: 'u2', role: 'moderator', joined_at: '2025-01-01T00:00:00Z' },
        { user_id: 'u3', role: 'member', joined_at: '2024-12-01T00:00:00Z' },
      ],
    };
    const result = classifyGroupSuccession(group);
    expect(result.type).toBe('promote_moderator');
    if (result.type === 'promote_moderator') {
      expect(result.moderator.user_id).toBe('u2');
    }
  });

  it('promotes earliest member when no moderators but members exist', () => {
    const group: ClassifiableGroup = {
      id: 'group2',
      members: [
        { user_id: 'u1', role: 'member', joined_at: '2025-03-01T00:00:00Z' },
        { user_id: 'u2', role: 'member', joined_at: '2025-01-01T00:00:00Z' },
      ],
    };
    const result = classifyGroupSuccession(group);
    expect(result.type).toBe('promote_member');
    if (result.type === 'promote_member') {
      expect(result.member.user_id).toBe('u2');
    }
  });

  it('blocks group when no members remain', () => {
    const group: ClassifiableGroup = {
      id: 'group3',
      members: [],
    };
    const result = classifyGroupSuccession(group);
    expect(result.type).toBe('block_group');
  });

  it('prefers moderator over member even if member joined earlier', () => {
    const group: ClassifiableGroup = {
      id: 'group4',
      members: [
        { user_id: 'u1', role: 'member', joined_at: '2024-01-01T00:00:00Z' },
        { user_id: 'u2', role: 'moderator', joined_at: '2025-06-01T00:00:00Z' },
      ],
    };
    const result = classifyGroupSuccession(group);
    expect(result.type).toBe('promote_moderator');
    if (result.type === 'promote_moderator') {
      expect(result.moderator.user_id).toBe('u2');
    }
  });

  it('promotes single member when only one exists', () => {
    const group: ClassifiableGroup = {
      id: 'group5',
      members: [
        { user_id: 'u1', role: 'member', joined_at: '2025-01-15T00:00:00Z' },
      ],
    };
    const result = classifyGroupSuccession(group);
    expect(result.type).toBe('promote_member');
    if (result.type === 'promote_member') {
      expect(result.member.user_id).toBe('u1');
    }
  });
});
