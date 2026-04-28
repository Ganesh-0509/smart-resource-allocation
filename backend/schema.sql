-- Namma Connect baseline schema for Supabase Postgres
-- Run this script in Supabase SQL editor for a clean environment.

create extension if not exists "pgcrypto";

create table if not exists ngos (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	email text unique not null,
	phone text,
	description text,
	district text,
	registration_number text,
	org_type text,
	state text,
	address text,
	website text,
	status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);


create table if not exists volunteers (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid not null references ngos(id) on delete cascade,
	name text not null,
	email text unique,
	phone text,
	gender text,
	dob date,
	blood_group text,
	skills text[] not null default '{}',
	ward text,
	district text,
	address text,
	lat double precision not null,
	lng double precision not null,
	availability boolean not null default true,
	emergency_contact_name text,
	emergency_contact_phone text,
	id_proof_type text,
	id_proof_number text,
	performance_score double precision not null default 0,
	total_tasks_done integer not null default 0,
	status text not null default 'pending' check (status in ('pending', 'approved', 'active', 'inactive', 'rejected')),
	joined_at timestamptz default now(),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists tasks (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid not null,
	title text not null,
	need_type text not null check (need_type in ('nutrition', 'medical', 'shelter', 'education', 'water', 'livelihood', 'other')),
	description text,
	urgency_score integer not null check (urgency_score >= 0 and urgency_score <= 100),
	ward text not null,
	district text not null,
	lat double precision not null,
	lng double precision not null,
	required_skills text[] not null default '{}',
	household_count integer not null default 1 check (household_count >= 1),
	source text not null default 'manual',
	status text not null default 'open' check (status in ('open', 'assigned', 'completed', 'failed', 'escalated')),
	escalation_level integer not null default 0,
	source_image_url text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists assignments (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid not null,
	task_id uuid not null references tasks(id) on delete cascade,
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	assigned_by text not null,
	assigned_at timestamptz not null default timezone('utc', now()),
	accepted_at timestamptz,
	completed_at timestamptz,
	failed_at timestamptz,
	outcome text,
	status text not null default 'assigned' check (status in ('assigned', 'accepted', 'in_progress', 'declined', 'reassigned', 'escalated', 'completed', 'failed')),
	sla_deadline timestamptz,
	sla_hours integer default 24,
	sla_breached boolean not null default false,
	check_in_time timestamptz,
	check_out_time timestamptz,
	check_in_lat double precision,
	check_in_lng double precision,
	check_out_lat double precision,
	check_out_lng double precision,
	escalated_to uuid references volunteers(id),
	escalation_reason text,
	notes text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Track assignment state transitions and history
create table if not exists assignment_history (
	id uuid primary key default gen_random_uuid(),
	assignment_id uuid not null references assignments(id) on delete cascade,
	old_status text,
	new_status text not null,
	changed_by text not null,
	reason text,
	changed_at timestamptz not null default timezone('utc', now())
);

-- Volunteer scheduling with time slots and recurring shifts
create table if not exists scheduling_slots (
	id uuid primary key default gen_random_uuid(),
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
	start_time time not null,
	end_time time not null,
	is_recurring boolean not null default true,
	is_available boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists survey_uploads (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid not null,
	image_url text,
	raw_ocr_text text,
	confidence_score double precision not null default 0,
	needs_review boolean not null default true,
	
	-- Structured data extracted and verified from OCR
	title text,
	need_type text,
	description text,
	urgency_score integer,
	ward text,
	district text,
	lat double precision,
	lng double precision,
	required_skills text[] not null default '{}',
	household_count integer default 1,

	extracted_task_id uuid references tasks(id) on delete set null,
	review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'approved', 'rejected', 'needs_correction')),
	reviewed_by uuid references volunteers(id) on delete set null,
	reviewed_at timestamptz,
	corrections text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Location geocoding confidence tracking for ward-to-coordinate mapping
create table if not exists location_geocoding (
	id uuid primary key default gen_random_uuid(),
	ward text not null,
	district text not null,
	latitude double precision not null,
	longitude double precision not null,
	confidence_score double precision not null default 0,
	data_source text not null default 'manual',
	verified_at timestamptz,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	unique(ward, district)
);
create table if not exists audit_logs (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid,
	user_id uuid,
	user_role text, -- 'ngo', 'volunteer', 'field_worker', 'admin', 'system'
	action_type text not null,
	entity_type text not null, -- 'report', 'task', 'volunteer', 'assignment'
	entity_id uuid,
	description text not null,
	created_at timestamptz not null default timezone('utc', now())
);

create table if not exists field_workers (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid references ngos(id) on delete cascade,
	name text not null,
	phone text unique not null,
	email text unique,
	designation text,
	base_location text,
	status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
	pin_hash text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Phase C: Impact Analytics and Reporting
create table if not exists volunteer_impact_metrics (
	id uuid primary key default gen_random_uuid(),
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	total_hours_worked integer not null default 0,
	households_served integer not null default 0,
	tasks_completed integer not null default 0,
	avg_completion_time_hours double precision,
	impact_score double precision not null default 0,
	last_calculated_at timestamptz not null default timezone('utc', now()),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- District-level impact tracking
create table if not exists district_impact_metrics (
	id uuid primary key default gen_random_uuid(),
	district text not null unique,
	total_households_served integer not null default 0,
	total_tasks_completed integer not null default 0,
	active_volunteers integer not null default 0,
	total_volunteer_hours integer not null default 0,
	avg_task_completion_rate double precision not null default 0,
	last_calculated_at timestamptz not null default timezone('utc', now()),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Task templates for recurring crises
create table if not exists task_templates (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	need_type text not null check (need_type in ('nutrition', 'medical', 'shelter', 'education', 'water', 'livelihood', 'other')),
	description text,
	base_urgency_score integer not null default 50 check (base_urgency_score >= 0 and base_urgency_score <= 100),
	required_skills text[] not null default '{}',
	estimated_hours integer not null default 2,
	is_active boolean not null default true,
	created_by uuid references volunteers(id) on delete set null,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Match suggestions for batch assignment
create table if not exists batch_match_suggestions (
	id uuid primary key default gen_random_uuid(),
	task_id uuid not null references tasks(id) on delete cascade,
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	match_score double precision not null,
	skill_score double precision,
	distance_score double precision,
	availability_score double precision,
	suggested_at timestamptz not null default timezone('utc', now()),
	accepted_at timestamptz,
	rejected_at timestamptz,
	created_at timestamptz not null default timezone('utc', now())
);

-- Batch assignment tracking
create table if not exists batch_assignments (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid not null,
	created_by uuid references volunteers(id) on delete set null,
	task_count integer not null default 0,
	volunteer_count integer not null default 0,
	matched_count integer not null default 0,
	completed_at timestamptz,
	notes text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_volunteers_availability on volunteers(availability);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_urgency_score on tasks(urgency_score desc);
create index if not exists idx_tasks_need_type on tasks(need_type);
create index if not exists idx_tasks_district on tasks(district);
create index if not exists idx_assignments_task_id on assignments(task_id);
create index if not exists idx_assignments_volunteer_id on assignments(volunteer_id);
create index if not exists idx_assignments_completed_at on assignments(completed_at);
create index if not exists idx_assignments_status on assignments(status);
create index if not exists idx_assignments_sla_deadline on assignments(sla_deadline);
create index if not exists idx_assignments_sla_breached on assignments(sla_breached);
create index if not exists idx_assignments_escalated_to on assignments(escalated_to);
create index if not exists idx_assignment_history_assignment_id on assignment_history(assignment_id);
create index if not exists idx_assignment_history_changed_at on assignment_history(changed_at desc);
create index if not exists idx_scheduling_slots_volunteer_id on scheduling_slots(volunteer_id);
create index if not exists idx_scheduling_slots_day_of_week on scheduling_slots(day_of_week);
create index if not exists idx_scheduling_slots_is_available on scheduling_slots(is_available);
create index if not exists idx_survey_uploads_review_status on survey_uploads(review_status);
create index if not exists idx_survey_uploads_confidence_score on survey_uploads(confidence_score desc);
create index if not exists idx_survey_uploads_needs_review on survey_uploads(needs_review);
create table if not exists intake_reports (
	id uuid primary key default gen_random_uuid(),
	ngo_id uuid not null,
	source text not null check (source in ('survey', 'ocr', 'field')),
	title text not null,
	description text,
	location_text text,
	lat double precision,
	lng double precision,
	urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
	status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
	raw_data jsonb,
	image_url text,
	possible_duplicate_of uuid references intake_reports(id) on delete set null,
	duplicate_score float default 0.0,
	reviewed_by uuid references volunteers(id) on delete set null,
	reviewed_at timestamptz,
	converted_to_task_id uuid references tasks(id) on delete set null,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_intake_reports_ngo_id on intake_reports(ngo_id);
create index if not exists idx_intake_reports_status on intake_reports(status);
create index if not exists idx_intake_reports_urgency on intake_reports(urgency);

create index if not exists idx_location_geocoding_confidence on location_geocoding(confidence_score desc);
create index if not exists idx_activity_log_task_id on activity_log(task_id);
create index if not exists idx_activity_log_created_at on activity_log(created_at desc);
create index if not exists idx_volunteer_impact_metrics_volunteer_id on volunteer_impact_metrics(volunteer_id);
create index if not exists idx_volunteer_impact_metrics_impact_score on volunteer_impact_metrics(impact_score desc);
create index if not exists idx_district_impact_metrics_district on district_impact_metrics(district);
create index if not exists idx_task_templates_need_type on task_templates(need_type);
create index if not exists idx_task_templates_is_active on task_templates(is_active);
create index if not exists idx_batch_match_suggestions_task_id on batch_match_suggestions(task_id);
create index if not exists idx_batch_match_suggestions_volunteer_id on batch_match_suggestions(volunteer_id);
create index if not exists idx_batch_match_suggestions_match_score on batch_match_suggestions(match_score desc);
create index if not exists idx_batch_assignments_created_by on batch_assignments(created_by);
create index if not exists idx_batch_assignments_created_at on batch_assignments(created_at desc);

create unique index if not exists idx_assignments_active_task_unique
	on assignments(task_id)
	where completed_at is null;

create or replace function set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

drop trigger if exists trg_ngos_updated_at on ngos;
create trigger trg_ngos_updated_at
before update on ngos
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_volunteers_updated_at on volunteers;
create trigger trg_volunteers_updated_at
before update on volunteers
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at
before update on tasks
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_survey_uploads_updated_at on survey_uploads;
create trigger trg_survey_uploads_updated_at
before update on survey_uploads
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_scheduling_slots_updated_at on scheduling_slots;
create trigger trg_scheduling_slots_updated_at
before update on scheduling_slots
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_location_geocoding_updated_at on location_geocoding;
create trigger trg_location_geocoding_updated_at
before update on location_geocoding
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_intake_reports_updated_at on intake_reports;
create trigger trg_intake_reports_updated_at
before update on intake_reports
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_assignments_updated_at on assignments;
create trigger trg_assignments_updated_at
before update on assignments
for each row
execute function set_updated_at_timestamp();

-- Trigger to detect SLA breaches
create or replace function check_sla_breach()
returns trigger
language plpgsql
as $$
begin
	if new.sla_deadline is not null and timezone('utc', now()) > new.sla_deadline and new.status not in ('completed', 'declined') then
		new.sla_breached = true;
	end if;
	return new;
end;
$$;

drop trigger if exists trg_assignments_sla_breach on assignments;
create trigger trg_assignments_sla_breach
before update on assignments
for each row
execute function check_sla_breach();

-- Trigger to automatically log status transitions
create or replace function log_assignment_status_change()
returns trigger
language plpgsql
as $$
begin
	if new.status != old.status then
		insert into assignment_history(assignment_id, old_status, new_status, changed_by, changed_at)
		values(new.id, old.status, new.status, coalesce(new.assigned_by, 'system'), timezone('utc', now()));
	end if;
	return new;
end;
$$;

drop trigger if exists trg_assignment_status_history on assignments;
create trigger trg_assignment_status_history
after update on assignments
for each row
execute function log_assignment_status_change();

-- Phase C: Updated_at triggers for new tables
drop trigger if exists trg_volunteer_impact_metrics_updated_at on volunteer_impact_metrics;
create trigger trg_volunteer_impact_metrics_updated_at
before update on volunteer_impact_metrics
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_district_impact_metrics_updated_at on district_impact_metrics;
create trigger trg_district_impact_metrics_updated_at
before update on district_impact_metrics
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_task_templates_updated_at on task_templates;
create trigger trg_task_templates_updated_at
before update on task_templates
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_batch_assignments_updated_at on batch_assignments;
create trigger trg_batch_assignments_updated_at
before update on batch_assignments
for each row
execute function set_updated_at_timestamp();

drop trigger if exists trg_field_workers_updated_at on field_workers;
create trigger trg_field_workers_updated_at
before update on field_workers
for each row
execute function set_updated_at_timestamp();

-- Multi-tenancy isolation policies
alter table volunteers enable row level security;
alter table tasks enable row level security;

create policy "ngo_isolation" on volunteers using (ngo_id = auth.uid());
create policy "ngo_isolation" on tasks using (ngo_id = auth.uid());

