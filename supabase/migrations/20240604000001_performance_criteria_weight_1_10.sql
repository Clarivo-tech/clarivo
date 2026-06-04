-- Allow criteria importance weights on 1–10 scale (was 1–3)

alter table public.performance_criteria
  drop constraint if exists performance_criteria_weight_check;

alter table public.performance_criteria
  add constraint performance_criteria_weight_check check (
    weight >= 1 and weight <= 10
  );
