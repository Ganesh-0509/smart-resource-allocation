export type VolunteerSkill =
  | "nutrition"
  | "medical"
  | "education"
  | "logistics"
  | "counselling"
  | "construction"
  | "water_sanitation"
  | "livelihood";

export type TaskNeedType =
  | "nutrition"
  | "medical"
  | "shelter"
  | "education"
  | "water"
  | "livelihood"
  | "other";

export type TaskStatus = "open" | "assigned" | "completed";

export interface VolunteerCreate {
  name: string;
  phone?: string | null;
  skills: VolunteerSkill[];
  lat: number;
  lng: number;
  availability?: boolean;
}

export interface Volunteer extends VolunteerCreate {
  id: string;
  performance_score: number;
  total_tasks_done: number;
  created_at: string;
}

export interface TaskCreate {
  title: string;
  need_type: TaskNeedType;
  description?: string;
  urgency_score: number;
  ward: string;
  district: string;
  lat: number;
  lng: number;
  required_skills: VolunteerSkill[] | string[];
  household_count: number;
  source: string;
}

export interface Task extends TaskCreate {
  id: string;
  status: TaskStatus;
  source_image_url?: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  task_id: string;
  volunteer_id: string;
  assigned_by: string;
  assigned_at?: string;
  completed_at?: string | null;
  outcome?: string | null;
  status: string;
  sla_deadline?: string | null;
  sla_hours?: number;
  sla_breached?: boolean;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  escalated_to?: string | null;
  escalation_reason?: string | null;
  notes?: string | null;
  task?: Task;
  tasks?: Task;
  volunteer?: Volunteer;
  volunteers?: Volunteer;
}

export interface AssignTaskResponse {
  message: string;
  task: Task;
  sms_sent: boolean;
}

export interface VolunteerMatch extends Volunteer {
  match_score: number;
  skill_score: number;
  distance_score: number;
  distance_km: number;
}

export interface DashboardStats {
  open_count: number;
  in_progress_count: number;
  completed_today: number;
  active_volunteers: number;
}

export interface DashboardActivity {
  id: string;
  action_type: string;
  actor_id: string;
  details: string;
  created_at: string;
  task_title?: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  urgency_score: number;
  title: string;
  ward?: string;
  need_type?: TaskNeedType | string;
  status: TaskStatus | string;
}

export interface OCRResult {
  upload_id: string;
  title: string;
  need_type: TaskNeedType | string;
  urgency_score: number;
  ward: string;
  district: string;
  lat: number;
  lng: number;
  household_count: number;
  required_skills: string[];
  summary: string;
  confidence_score: number;
  needs_review: boolean;
}

export interface DeleteVolunteerResponse {
  message: string;
}
