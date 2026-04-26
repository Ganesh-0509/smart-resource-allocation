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

export type TaskStatus = "open" | "assigned" | "completed" | "failed" | "escalated";
export type VolunteerStatus = "pending" | "approved" | "active" | "inactive" | "rejected";

export interface VolunteerCreate {
  name: string;
  phone?: string | null;
  skills: VolunteerSkill[];
  ward: string;
  district: string;
  lat: number;
  lng: number;
  availability?: boolean;
}

export interface Volunteer extends VolunteerCreate {
  id: string;
  status: VolunteerStatus;
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
  escalation_level: number;
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
  accepted_at?: string | null;
  failed_at?: string | null;
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
  breakdown?: {
    skill_match: number;
    distance: number;
    availability: number;
    reliability: number;
  };
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

export interface SchedulingSlot {
  id: string;
  volunteer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerSchedule {
  volunteer_id: string;
  volunteer_name: string;
  slots: SchedulingSlot[];
}

export interface OCRReviewItem {
  id: string;
  image_url: string;
  raw_ocr_text: string;
  confidence_score: number;
  extracted_task_id: string | null;
  needs_review: boolean;
  review_status: string;
  created_at: string;
  title?: string;
  need_type?: string;
  description?: string;
  urgency_score?: number;
  ward?: string;
  district?: string;
  lat?: number;
  lng?: number;
  required_skills?: string[];
  household_count?: number;
}

export type IntakeSource = "survey" | "ocr" | "field";
export type IntakeUrgency = "low" | "medium" | "high";
export type IntakeStatus = "pending" | "reviewed" | "approved" | "rejected";

export interface IntakeReport {
  id: string;
  ngo_id: string;
  source: IntakeSource;
  title: string;
  description?: string;
  location_text?: string;
  lat?: number;
  lng?: number;
  urgency: IntakeUrgency;
  status: IntakeStatus;
  possible_duplicate_of?: string;
  duplicate_score: number;
  raw_data?: any;
  image_url?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  converted_to_task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface IntakeReportCreate {
  title: string;
  description?: string;
  source: IntakeSource;
  urgency: IntakeUrgency;
  location_text?: string;
  lat?: number;
  lng?: number;
  raw_data?: any;
  image_url?: string;
}

export interface OCRReviewStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  needs_correction: number;
  average_confidence: number;
  low_confidence_count: number;
}

export interface VolunteerImpactMetrics {
  total_hours_worked: number;
  households_served: number;
  tasks_completed: number;
  avg_completion_time_hours: number | null;
  impact_score: number;
}

export interface DistrictImpactMetrics {
  district: string;
  total_households_served: number;
  total_tasks_completed: number;
  active_volunteers: number;
  total_volunteer_hours: number;
  avg_task_completion_rate: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  need_type: string;
  description: string | null;
  base_urgency_score: number;
  required_skills: string[];
  estimated_hours: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchMatchSuggestion {
  id: string;
  task_id: string;
  volunteer_id: string;
  match_score: number;
  skill_score: number | null;
  distance_score: number | null;
  availability_score: number | null;
  suggested_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

export interface BatchAssignment {
  id: string;
  task_count: number;
  volunteer_count: number;
  matched_count: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  ngo_id: string;
  user_id?: string;
  user_role?: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
}
