export interface User {
  id: string;
  name: string;
  pin_code: string;
  push_token?: string;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description?: string;
  duration_days: number;
  start_date?: string;
  status: 'proposed' | 'active' | 'completed' | 'cancelled';
  proposed_by: string;
  manon_approved: boolean;
  melvin_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChallengeActivity {
  id: string;
  challenge_id: string;
  name: string;
  target_count?: number;
  unit: string;
  duration_minutes?: number;
  sort_order: number;
}

export interface DailyCompletion {
  id: string;
  challenge_id: string;
  user_id: string;
  day_number: number;
  completed_at: string;
}

export interface ActivityProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  activity_id: string;
  day_number: number;
  progress_count: number;
  completed: boolean;
  completed_at: string;
  updated_at: string;
}
