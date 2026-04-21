-- Namma Connect baseline schema for Supabase Postgres
-- Run this script in Supabase SQL editor for a clean environment.

create extension if not exists "pgcrypto";

create table if not exists volunteers (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	phone text,
	skills text[] not null default '{}',
	lat double precision not null,
	lng double precision not null,
	availability boolean not null default true,
	performance_score double precision not null default 0,
	total_tasks_done integer not null default 0,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists tasks (
	id uuid primary key default gen_random_uuid(),
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
	status text not null default 'open' check (status in ('open', 'assigned', 'completed')),
	source_image_url text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists assignments (
	id uuid primary key default gen_random_uuid(),
	task_id uuid not null references tasks(id) on delete cascade,
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	assigned_by text not null,
	assigned_at timestamptz not null default timezone('utc', now()),
	completed_at timestamptz,
	outcome text,
	status text not null default 'assigned' check (status in ('assigned', 'accepted', 'declined', 'reassigned', 'escalated', 'completed')),
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

create table if not exists survey_uploads (
	id uuid primary key default gen_random_uuid(),
	image_url text not null,
	raw_ocr_text text,
	confidence_score double precision not null default 0,
	needs_review boolean not null default true,
	extracted_task_id uuid references tasks(id) on delete set null,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists activity_log (
	id uuid primary key default gen_random_uuid(),
	action_type text,
	actor_id uuid,
	task_id uuid references tasks(id) on delete set null,
	details text,
	created_at timestamptz not null default timezone('utc', now())
);

-- Volunteer scheduling: time-slot availability
create table if not exists volunteer_time_slots (
	id uuid primary key default gen_random_uuid(),
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
	start_time time not null,
	end_time time not null,
	is_available boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Recurring shifts for volunteers
create table if not exists volunteer_shifts (
	id uuid primary key default gen_random_uuid(),
	volunteer_id uuid not null references volunteers(id) on delete cascade,
	shift_name text not null,
	start_date date not null,
	end_date date,
	monday boolean not null default false,
	tuesday boolean not null default false,
	wednesday boolean not null default false,
	thursday boolean not null default false,
	friday boolean not null default false,
	saturday boolean not null default false,
	sunday boolean not null default false,
	start_time time not null,
	end_time time not null,
	max_tasks_per_shift integer default 5,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- OCR Review Queue for coordinator review
create table if not exists ocr_review_queue (
	id uuid primary key default gen_random_uuid(),
	survey_upload_id uuid not null references survey_uploads(id) on delete cascade,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'corrected')),
	confidence_threshold double precision not null default 0.7,
	needs_manual_review boolean not null default false,
	reviewer_id text,
	reviewed_at timestamptz,
	corrections_made text,
	corrected_fields text[] default '{}',
	original_data text,
	corrected_data text,
	reason_for_correction text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Geocoding cache for ward-to-coordinate mapping
create table if not exists geocoding_cache (
	id uuid primary key default gen_random_uuid(),
	ward text not null,
	district text not null,
	lat double precision not null,
	lng double precision not null,
	confidence double precision not null default 0.8,
	source text default 'manual',
	verified boolean not null default false,
	created_at timestamptz not null default timezone('utc', now()),
	unique(ward, district)
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
create index if not exists idx_activity_log_task_id on activity_log(task_id);
create index if not exists idx_activity_log_created_at on activity_log(created_at desc);

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

-- Also check SLA on insert so newly created assignments with past deadlines are marked
drop trigger if exists trg_assignments_sla_breach_insert on assignments;
create trigger trg_assignments_sla_breach_insert
before insert on assignments
for each row
execute function check_sla_breach();

-- Trigger to automatically log status transitions (updates)
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

-- Trigger to add initial history row when assignment is created
create or replace function log_assignment_status_insert()
returns trigger
language plpgsql
as $$
begin
	insert into assignment_history(assignment_id, old_status, new_status, changed_by, changed_at)
	values(new.id, NULL, new.status, coalesce(new.assigned_by, 'system'), timezone('utc', now()));
	return new;
end;
$$;

drop trigger if exists trg_assignment_status_history_insert on assignments;
create trigger trg_assignment_status_history_insert
after insert on assignments
for each row
execute function log_assignment_status_insert();
