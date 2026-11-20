alter table public.qc100_jersey_requests
  add column payment_provider text check (payment_provider in ('cashfree_order', 'cashfree_link'));

update public.qc100_jersey_requests
set payment_provider = 'cashfree_order'
where payment_status in ('pending', 'paid');
