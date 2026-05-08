/**
 * Validation constants for the Event Crew feature.
 * Used by server actions and UI components.
 */

// Crew name constraints
export const CREW_NAME_MIN_LENGTH = 3;
export const CREW_NAME_MAX_LENGTH = 120;

// Crew description constraint
export const CREW_DESCRIPTION_MAX_LENGTH = 2000;

// Crew capacity (number of participants including the host)
export const CREW_CAPACITY_MIN = 2;
export const CREW_CAPACITY_MAX = 10;

// Chat message length limit
export const CREW_MESSAGE_MAX_LENGTH = 2000;

// Invitation message length limit
export const CREW_INVITATION_MESSAGE_MAX_LENGTH = 300;

// Maximum invitations that can be sent per crew (including declined and pending)
export const MAX_INVITATIONS_PER_CREW = 20;

// Maximum active crews a single user can create
export const MAX_ACTIVE_CREWS_PER_USER = 10;
