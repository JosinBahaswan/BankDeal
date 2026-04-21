-- Role baseline seed: 3 user roles + 1 admin (Daniel)

insert into public.users (
  id,
  email,
  name,
  password_hash,
  type,
  company,
  phone,
  is_active,
  email_verified
) values
  (
    '00000000-0000-0000-0000-000000000901',
    'daniel@dealbank.local',
    'Daniel',
    '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a',
    'admin',
    'DealBank HQ',
    '+1-916-555-1901',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000902',
    'nora.dealmaker@dealbank.local',
    'Nora Carter',
    '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a',
    'dealmaker',
    'Carter Off-Market Homes',
    '+1-916-555-1902',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000903',
    'ryan.contractor@dealbank.local',
    'Ryan Brooks',
    '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a',
    'contractor',
    'Brooks Build Co',
    '+1-916-555-1903',
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000904',
    'claire.realtor@dealbank.local',
    'Claire Morgan',
    '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a',
    'realtor',
    'Morgan Realty Group',
    '+1-916-555-1904',
    true,
    true
  )
on conflict (email) do update
set
  name = excluded.name,
  type = excluded.type,
  company = excluded.company,
  phone = excluded.phone,
  is_active = excluded.is_active,
  email_verified = excluded.email_verified;
