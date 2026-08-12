/**
 * Enum values for chapters table CHECK constraints.
 * Source: Live Supabase database
 */

export const STAGES = [
  'prospect',
  'assigned',
  'dm_sent',
  'fu1',
  'fu2',
  'responded',
  'dm_found',
  'phone',
  'call_sched',
  'call_done',
  'qualified',
  'quote',
  'proposal',
  'decision',
  'contract',
  'booked',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  'prospect': 'Prospect',
  'assigned': 'Assigned',
  'dm_sent': 'DM Sent',
  'fu1': 'Follow-up 1',
  'fu2': 'Follow-up 2',
  'responded': 'Responded',
  'dm_found': 'DM Found',
  'phone': 'Phone',
  'call_sched': 'Call Scheduled',
  'call_done': 'Call Done',
  'qualified': 'Qualified',
  'quote': 'Quote',
  'proposal': 'Proposal',
  'decision': 'Decision',
  'contract': 'Contract',
  'booked': 'Booked',
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
  'phone_handoff',
  'missed_warm',
  'stalled_reply',
  'stale_one_touch',
  'recent_one_touch',
  'blocked',
] as const;

export const BUCKET_LABELS: Record<string, string> = {
  'phone_handoff': 'Phone Handoff',
  'missed_warm': 'Missed Warm',
  'stalled_reply': 'Stalled Reply',
  'stale_one_touch': 'Stale 1-Touch',
  'recent_one_touch': 'Recent 1-Touch',
  'blocked': 'Blocked',
};

export const SCRIPT_VERSIONS = [
  'v1.0',
  'v1.1',
  'v2.0',
  'v2.1',
  'v3.0',
] as const;

export const PHASES = [
  'Not Started',
  'Outreach',
  'Engaged',
  'In Conversation',
  'Deal',
] as const;

export const PHASE_STAGES: Record<string, string[]> = {
  'Not Started': ['prospect', 'assigned'],
  'Outreach': ['dm_sent', 'fu1', 'fu2'],
  'Engaged': ['responded', 'dm_found'],
  'In Conversation': ['phone', 'call_sched', 'call_done', 'qualified'],
  'Deal': ['quote', 'proposal', 'decision', 'contract', 'booked'],
};

export const NEXT_ACTION_TYPES = [
  'send_dm',
  'follow_up_1',
  'follow_up_2',
  'reply_thread',
  'text_handoff',
  'call',
  'send_quote',
  'schedule_call',
  'find_alt_channel',
  're_engage_later',
] as const;

export const NEXT_ACTION_TYPE_LABELS: Record<string, string> = {
  'send_dm': 'Send DM',
  'follow_up_1': 'Follow-Up #1',
  'follow_up_2': 'Follow-Up #2',
  'reply_thread': 'Reply & Route',
  'text_handoff': 'Text Handoff',
  'call': 'Call',
  'send_quote': 'Send Quote',
  'schedule_call': 'Schedule Call',
  'find_alt_channel': 'Find Alt Channel',
  're_engage_later': 'Re-engage Later',
};

export const NEXT_ACTION_TYPE_COLORS: Record<string, string> = {
  'send_dm': 'bg-blue-100 text-blue-800',
  'follow_up_1': 'bg-purple-100 text-purple-800',
  'follow_up_2': 'bg-purple-100 text-purple-800',
  'reply_thread': 'bg-green-100 text-green-800',
  'text_handoff': 'bg-yellow-100 text-yellow-800',
  'call': 'bg-red-100 text-red-800',
  'send_quote': 'bg-indigo-100 text-indigo-800',
  'schedule_call': 'bg-orange-100 text-orange-800',
  'find_alt_channel': 'bg-pink-100 text-pink-800',
  're_engage_later': 'bg-gray-100 text-gray-800',
};
