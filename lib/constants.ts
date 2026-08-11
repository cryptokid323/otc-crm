/**
 * Enum values for chapters table CHECK constraints.
 * Source: Live Supabase database
 */

export const STAGES = [
  'dm_sent',
  'responded',
  'phone',
  'meeting',
  'proposal',
  'negotiation',
  'contract_pending',
  'contract_signed',
  'deposit_pending',
  'deposit_received',
  'event_scheduled',
  'stalled',
  'lost',
  'competitor',
  'dnc',
  'archived',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  'dm_sent': 'DM Sent',
  'responded': 'Responded',
  'phone': 'Phone',
  'meeting': 'Meeting',
  'proposal': 'Proposal',
  'negotiation': 'Negotiating',
  'contract_pending': 'Contract Pending',
  'contract_signed': 'Contract Signed',
  'deposit_pending': 'Deposit Pending',
  'deposit_received': 'Deposit Received',
  'event_scheduled': 'Event Scheduled',
  'stalled': 'Stalled',
  'lost': 'Lost',
  'competitor': 'Competitor Won',
  'dnc': 'Do Not Contact',
  'archived': 'Archived',
};

export const CLASSIFICATIONS = [
  'active',
  'future',
  'competitor',
  'planned',
  'not_interested',
  'too_small',
  'blocked',
  'dnc',
  'bad_account',
  'wrong_chapter',
  'duplicate',
] as const;

export const CLASSIFICATION_LABELS: Record<string, string> = {
  'active': 'Active',
  'future': 'Future Prospect',
  'competitor': 'Using Competitor',
  'planned': 'Already Planned',
  'not_interested': 'Not Interested',
  'too_small': 'Too Small',
  'blocked': 'Blocked',
  'dnc': 'Do Not Contact',
  'bad_account': 'Bad Account',
  'wrong_chapter': 'Wrong Chapter',
  'duplicate': 'Duplicate',
};

export const BUCKETS = [
  'recent_one_touch',
  'stale_one_touch',
  'stalled_reply',
  'phone_handoff',
  'missed_warm',
  'blocked',
] as const;

export const BUCKET_LABELS: Record<string, string> = {
  'recent_one_touch': 'Recent 1-Touch',
  'stale_one_touch': 'Stale 1-Touch',
  'stalled_reply': 'Stalled Reply',
  'phone_handoff': 'Phone Handoff',
  'missed_warm': 'Missed Warm',
  'blocked': 'Blocked',
};

export const SCRIPT_VERSIONS = [
  'v1.0',
  'v1.1',
  'v2.0',
  'v2.1',
  'v3.0',
] as const;
