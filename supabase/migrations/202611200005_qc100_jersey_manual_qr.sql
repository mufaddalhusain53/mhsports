alter table public.qc100_jersey_requests
  drop constraint qc100_jersey_requests_payment_provider_check;

alter table public.qc100_jersey_requests
  add constraint qc100_jersey_requests_payment_provider_check
  check (payment_provider in ('cashfree_order', 'cashfree_link', 'manual_qr'));
