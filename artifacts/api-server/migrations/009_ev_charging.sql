alter table public.geit_engineering_projects
  drop constraint geit_engineering_projects_module_check;

alter table public.geit_engineering_projects
  add constraint geit_engineering_projects_module_check
  check (module in (
    'energy-consulting',
    'energy-auditing',
    'renewable-energy',
    'battery-flexibility',
    'carbon-footprint',
    'digital-energy',
    'ev-charging'
  ));
