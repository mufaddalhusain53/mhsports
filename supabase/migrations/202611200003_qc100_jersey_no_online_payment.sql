do $$
declare
  matches text[];
begin
  select array_agg(c.conname::text) into matches
  from pg_constraint c
  where c.conrelid = 'public.qc100_jersey_requests'::regclass
    and c.contype = 'c'
    and cardinality(c.conkey) = 2
    and c.conkey @> array[
      (select attnum from pg_attribute where attrelid = c.conrelid and attname = 'amount'),
      (select attnum from pg_attribute where attrelid = c.conrelid and attname = 'payment_status')
    ]
    and pg_get_constraintdef(c.oid) like '%''free''%'
    and pg_get_constraintdef(c.oid) like '%''pending''%'
    and pg_get_constraintdef(c.oid) like '%''paid''%';

  if coalesce(cardinality(matches), 0) <> 1 then
    raise exception 'Expected one jersey payment status constraint, found %; inspect the table constraints before continuing',
      coalesce(cardinality(matches), 0);
  end if;

  execute format('alter table public.qc100_jersey_requests drop constraint %I', matches[1]);
  alter table public.qc100_jersey_requests
    add constraint qc100_jersey_requests_payment_status_check check (
      payment_status = 'not_collected' or
      (amount = 0 and payment_status = 'free') or
      (amount > 0 and payment_status in ('pending', 'paid'))
    );
end $$;
