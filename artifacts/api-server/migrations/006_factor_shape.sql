-- Authenticated clients can call RPCs directly: required metadata must also
-- be enforced in PostgreSQL, not just in the Express boundary.
alter table public.geit_emission_factors add constraint geit_factor_required_shape check(
 jsonb_typeof(definition)='object'
 and definition ?& array['code','name','source','sourceUrl','geography','activityUnit','emissionUnit','value','validFrom','validUntil','scope','category','scope2Method','gwpBasis']
 and jsonb_typeof(definition->'code')='string'
 and jsonb_typeof(definition->'name')='string'
 and jsonb_typeof(definition->'source')='string'
 and jsonb_typeof(definition->'sourceUrl')='string'
 and jsonb_typeof(definition->'geography')='string'
 and jsonb_typeof(definition->'activityUnit')='string'
 and jsonb_typeof(definition->'emissionUnit')='string'
 and jsonb_typeof(definition->'value')='number'
 and jsonb_typeof(definition->'validFrom')='string'
 and jsonb_typeof(definition->'validUntil')='string'
 and jsonb_typeof(definition->'scope')='string'
 and jsonb_typeof(definition->'category')='string'
 and jsonb_typeof(definition->'gwpBasis')='string'
 and length(definition->>'sourceUrl')<=1000
 and definition->>'validFrom' ~ '^\d{4}-\d{2}-\d{2}$'
 and definition->>'validUntil' ~ '^\d{4}-\d{2}-\d{2}$'
);
