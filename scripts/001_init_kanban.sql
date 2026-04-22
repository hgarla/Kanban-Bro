-- Kanban schema (no-auth: permissive RLS policies for the anon role)

-- Projects: tags used to organize tasks across workflows
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Columns: the board's vertical lanes
create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null,
  created_at timestamptz not null default now()
);

-- Labels: colored tags attachable to tasks
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#64748b'
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  column_id uuid references public.columns(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  position int not null default 0,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_date timestamptz,
  github_repo_url text,
  created_by text not null default 'me',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_column_position_idx on public.tasks (column_id, position);

create table if not exists public.task_labels (
  task_id uuid references public.tasks(id) on delete cascade,
  label_id uuid references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  kind text not null check (kind in ('upload','link')),
  name text not null,
  url text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  author text not null default 'me',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  actor text not null default 'me',
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS with wide-open policies (public board, no auth)
alter table public.projects enable row level security;
alter table public.columns enable row level security;
alter table public.labels enable row level security;
alter table public.tasks enable row level security;
alter table public.task_labels enable row level security;
alter table public.checklist_items enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.activity enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'projects','columns','labels','tasks','task_labels',
      'checklist_items','attachments','comments','activity'
    ])
  loop
    execute format('drop policy if exists "public_all" on public.%I', t);
    execute format('create policy "public_all" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime publication
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'projects','columns','labels','tasks','task_labels',
      'checklist_items','attachments','comments','activity'
    ])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
