export type ProjectStatus = 'pending' | 'approved' | 'rejected';

export interface Project {
  id: string;
  school_name: string;
  project_name: string;
  youtube_url: string;
  youtube_video_id: string;
  members: string[];
  status: ProjectStatus;
  created_at?: string;
  total_likes?: number;
  has_liked?: boolean;
}

export interface ContestSettings {
  id: number;
  contest_name: string;
  are_results_public: boolean;
  is_voting_active: boolean;
  is_registration_open: boolean;
  updated_at?: string;
}

export interface ContestResult {
  project_id: string;
  school_name: string;
  project_name: string;
  youtube_video_id: string;
  youtube_url: string;
  members: string[];
  total_votes: number;
  percentage?: number;
  rank?: number;
  is_tie?: boolean;
}

export interface ToggleLikeResponse {
  success: boolean;
  liked?: boolean;
  total_likes?: number;
  error?: string;
  requiresAuth?: boolean;
}
