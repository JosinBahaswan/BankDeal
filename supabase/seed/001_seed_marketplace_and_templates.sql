-- DealBank baseline seed data

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
  ('00000000-0000-0000-0000-000000000001', 'admin@dealbank.local', 'DealBank Admin', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'admin', 'DealBank HQ', '+1-916-555-0001', true, true),
  ('00000000-0000-0000-0000-000000000010', 'aria@dealbank.local', 'Aria Wilson', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'dealmaker', 'Wilson Off-Market Homes', '+1-916-555-1010', true, true),

  ('00000000-0000-0000-0000-000000000101', 'mike.plumbing@dealbank.local', 'Mike Johnson', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'contractor', 'Mikes Premier Plumbing', '+1-916-555-1101', true, true),
  ('00000000-0000-0000-0000-000000000102', 'sarah.electric@dealbank.local', 'Sarah Martinez', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'contractor', 'Elite Electrical Solutions', '+1-916-555-1102', true, true),
  ('00000000-0000-0000-0000-000000000103', 'david.roofing@dealbank.local', 'David Kim', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'contractor', 'Precision Roofing Co', '+1-916-555-1103', true, true),
  ('00000000-0000-0000-0000-000000000104', 'rebecca.hvac@dealbank.local', 'Rebecca Chen', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'contractor', 'Golden State HVAC', '+1-916-555-1104', true, true),
  ('00000000-0000-0000-0000-000000000105', 'carlos.flooring@dealbank.local', 'Carlos Lopez', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'contractor', 'West Coast Flooring', '+1-916-555-1105', true, true),
  ('00000000-0000-0000-0000-000000000106', 'james.renovation@dealbank.local', 'James Wilson', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'contractor', 'NorCal Complete Renovation', '+1-916-555-1106', true, true),

  ('00000000-0000-0000-0000-000000000201', 'jennifer.realty@dealbank.local', 'Jennifer Thompson', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'realtor', 'Keller Williams Sacramento', '+1-916-555-1201', true, true),
  ('00000000-0000-0000-0000-000000000202', 'michael.homes@dealbank.local', 'Michael Rodriguez', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'realtor', 'Coldwell Banker Elk Grove', '+1-916-555-1202', true, true),
  ('00000000-0000-0000-0000-000000000203', 'amanda.prop@dealbank.local', 'Amanda Foster', '$2b$12$C6UzMDM.H6dfI/f/IKxGhu8rR6fM9vDOMkMt2rt7NmBGG99nmHn7a', 'realtor', 'RE/MAX Premier Fresno', '+1-916-555-1203', true, true)
on conflict (id) do nothing;

insert into public.contractor_profiles (
  id,
  user_id,
  years_experience,
  license_number,
  city,
  service_radius,
  rate_type,
  rate_amount,
  bio,
  is_licensed,
  is_insured,
  is_bonded,
  subscription_tier,
  verified_badge,
  rating,
  total_jobs
) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', 12, 'CA-PLB-89211', 'Sacramento', 35, 'both', 95.00, 'Residential plumbing specialist for value-add renovations.', true, true, true, 'pro', true, 4.9, 127),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000102', 15, 'CA-ELE-33210', 'Roseville', 45, 'hourly', 110.00, 'Panel upgrades and full rewires for flips and rentals.', true, true, true, 'pro', true, 4.8, 89),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000103', 10, 'CA-ROO-55129', 'Fresno', 55, 'project', 14500.00, 'Composition and tile roof replacement with photo reporting.', true, true, true, 'pro', true, 4.7, 76),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000104', 11, 'CA-HVC-14773', 'Modesto', 50, 'both', 120.00, 'HVAC replacement, ducting, and permit support.', true, true, true, 'basic', false, 4.6, 64),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000105', 9,  'CA-FLR-90981', 'Bakersfield', 40, 'project', 7800.00, 'LVP and tile flooring packages for fast turn projects.', true, true, false, 'basic', false, 4.5, 58),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000106', 18, 'CA-GEN-22334', 'Sacramento', 70, 'both', 130.00, 'Full rehab GC: permitting, subs, and schedule management.', true, true, true, 'pro', true, 4.9, 143)
on conflict (id) do nothing;

insert into public.contractor_trades (contractor_id, trade) values
  ('00000000-0000-0000-0000-000000001001', 'Plumbing'),
  ('00000000-0000-0000-0000-000000001002', 'Electrical'),
  ('00000000-0000-0000-0000-000000001003', 'Roofing'),
  ('00000000-0000-0000-0000-000000001004', 'HVAC'),
  ('00000000-0000-0000-0000-000000001005', 'Flooring'),
  ('00000000-0000-0000-0000-000000001006', 'Full Rehab')
on conflict do nothing;

insert into public.realtor_profiles (
  id,
  user_id,
  dre_license,
  brokerage,
  avg_days_to_close,
  deals_per_year,
  bio,
  commission_split
) values
  ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000201', 'DRE-01999211', 'Keller Williams Sacramento', 24, 38, 'Investor-friendly listing specialist focused on fast dispositions.', 25.00),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000202', 'DRE-02077419', 'Coldwell Banker Elk Grove', 27, 31, 'Fix-and-flip listing strategist with repeat buyer network.', 25.00),
  ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000000203', 'DRE-01833010', 'RE/MAX Premier Fresno', 29, 34, 'Central Valley disposition specialist for distressed inventory.', 25.00)
on conflict (id) do nothing;

insert into public.realtor_markets (realtor_id, city) values
  ('00000000-0000-0000-0000-000000002001', 'Sacramento'),
  ('00000000-0000-0000-0000-000000002001', 'Roseville'),
  ('00000000-0000-0000-0000-000000002002', 'Elk Grove'),
  ('00000000-0000-0000-0000-000000002002', 'Stockton'),
  ('00000000-0000-0000-0000-000000002003', 'Fresno'),
  ('00000000-0000-0000-0000-000000002003', 'Bakersfield')
on conflict do nothing;

insert into public.realtor_specialties (realtor_id, specialty) values
  ('00000000-0000-0000-0000-000000002001', 'Fix and Flip Disposition'),
  ('00000000-0000-0000-0000-000000002001', 'First-Time Investor Buyers'),
  ('00000000-0000-0000-0000-000000002002', 'Value-Add SFR Resale'),
  ('00000000-0000-0000-0000-000000002002', 'Off-Market Buyer Match'),
  ('00000000-0000-0000-0000-000000002003', 'Distressed Asset Listing'),
  ('00000000-0000-0000-0000-000000002003', 'Rental Portfolio Liquidation')
on conflict do nothing;

insert into public.deals (
  id,
  user_id,
  address,
  arv,
  offer_pct,
  offer_price,
  stage,
  total_reno,
  total_hm,
  total_holding,
  total_selling,
  all_in_cost,
  net_profit,
  roi
) values
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000010', '1234 Oak Street, Sacramento, CA 95814', 350000, 60, 182000, 'Under Contract', 45000, 14560, 9800, 19250, 270610, 79390, 29.34),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000010', '5678 Pine Ave, Fresno, CA 93721', 420000, 60, 231000, 'Analyzing', 55000, 18620, 11400, 23100, 339120, 80880, 23.85),
  ('00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000000010', '7750 Alhambra Blvd, Sacramento, CA 95828', 355000, 58, 194000, 'Renovating', 48000, 15340, 9200, 19525, 286065, 68935, 24.10),
  ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000000010', '2419 Yosemite Ave, Modesto, CA 95354', 330000, 57, 176500, 'Listing', 51000, 13800, 8600, 18150, 268050, 61950, 23.11),
  ('00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000000010', '981 E Olive Ave, Fresno, CA 93728', 390000, 59, 214500, 'Under Contract', 60000, 17280, 10200, 21450, 323430, 66570, 20.58),
  ('00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000000010', '4321 Chester Ave, Bakersfield, CA 93301', 295000, 56, 152000, 'Analyzing', 42000, 12160, 7900, 16225, 230285, 64715, 28.10)
on conflict (id) do nothing;

insert into public.marketplace_listings (
  id,
  deal_id,
  seller_id,
  address,
  city,
  state,
  zip,
  beds,
  baths,
  sqft,
  year_built,
  arv,
  asking_price,
  assignment_fee,
  reno_estimate,
  equity,
  roi,
  deal_type,
  condition,
  description,
  highlights,
  status,
  days_on_market,
  view_count,
  save_count
) values
  (
    '00000000-0000-0000-0000-000000004001',
    '00000000-0000-0000-0000-000000003001',
    '00000000-0000-0000-0000-000000000010',
    '1234 Oak Street',
    'Sacramento',
    'CA',
    '95814',
    3,
    2,
    1250,
    1978,
    350000,
    220000,
    15000,
    45000,
    85000,
    29.34,
    'wholesale',
    'fair',
    'Strong ARV spread with clean title and easy access for showings.',
    '{Near downtown corridor,Light rehab scope,Good investor demand}',
    'active',
    3,
    88,
    24
  ),
  (
    '00000000-0000-0000-0000-000000004002',
    '00000000-0000-0000-0000-000000003002',
    '00000000-0000-0000-0000-000000000010',
    '5678 Pine Ave',
    'Fresno',
    'CA',
    '93721',
    4,
    3,
    1800,
    1985,
    420000,
    280000,
    20000,
    55000,
    85000,
    23.85,
    'fix_and_flip',
    'good',
    'Larger floorplan in a high-turnover submarket with strong resale comps.',
    '{Corner lot,Updated electrical panel,Large lot footprint}',
    'active',
    6,
    121,
    37
  ),
  (
    '00000000-0000-0000-0000-000000004003',
    '00000000-0000-0000-0000-000000003003',
    '00000000-0000-0000-0000-000000000010',
    '7750 Alhambra Blvd',
    'Sacramento',
    'CA',
    '95828',
    3,
    2,
    1320,
    1984,
    355000,
    205000,
    14000,
    48000,
    88000,
    24.10,
    'wholesale',
    'fair',
    'Tenant-vacant single family with reliable contractor bids ready.',
    '{Rental demand pocket,Comps within 0.5 miles,Clear chain of title}',
    'active',
    2,
    64,
    19
  ),
  (
    '00000000-0000-0000-0000-000000004004',
    '00000000-0000-0000-0000-000000003004',
    '00000000-0000-0000-0000-000000000010',
    '2419 Yosemite Ave',
    'Modesto',
    'CA',
    '95354',
    3,
    2,
    1460,
    1976,
    330000,
    198000,
    12000,
    51000,
    69000,
    23.11,
    'fix_and_flip',
    'rough',
    'Needs cosmetic and systems updates, priced for experienced flippers.',
    '{Permit records available,Quiet street,ARV validated by 3 sold comps}',
    'active',
    9,
    102,
    28
  ),
  (
    '00000000-0000-0000-0000-000000004005',
    '00000000-0000-0000-0000-000000003005',
    '00000000-0000-0000-0000-000000000010',
    '981 E Olive Ave',
    'Fresno',
    'CA',
    '93728',
    4,
    2,
    1695,
    1968,
    390000,
    248000,
    18000,
    60000,
    82000,
    20.58,
    'buy_and_hold',
    'fair',
    'Strong rent comps and room for ADU add-on after rehab.',
    '{Potential ADU,Close to transit,Low vacancy submarket}',
    'active',
    4,
    77,
    22
  ),
  (
    '00000000-0000-0000-0000-000000004006',
    '00000000-0000-0000-0000-000000003006',
    '00000000-0000-0000-0000-000000000010',
    '4321 Chester Ave',
    'Bakersfield',
    'CA',
    '93301',
    3,
    2,
    1185,
    1971,
    295000,
    179000,
    11000,
    42000,
    63000,
    28.10,
    'wholesale',
    'good',
    'Compact value-add project with efficient scope and healthy spread.',
    '{Low DOM neighborhood,Modernized nearby comps,Simple floorplan rehab}',
    'active',
    1,
    49,
    11
  )
on conflict (id) do nothing;

insert into public.marketplace_saves (user_id, listing_id) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000004001'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000004004'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000004002'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000004003')
on conflict do nothing;

insert into public.contract_templates (
  id,
  slug,
  template_type,
  name,
  description,
  form_fields,
  clauses,
  is_active
) values
  (
    '00000000-0000-0000-0000-000000005001',
    'assignment-agreement-v1',
    'assignment',
    'Assignment Agreement (DealBank Standard)',
    'For wholesale assignment transactions with transparent platform fee disclosure.',
    '[
      {"key":"property_address","label":"Property Address","type":"text","required":true},
      {"key":"seller_name","label":"Original Seller Name","type":"text","required":true},
      {"key":"assignor_name","label":"Assignor (Wholesaler)","type":"text","required":true},
      {"key":"assignee_name","label":"Assignee (End Buyer)","type":"text","required":true},
      {"key":"contract_price","label":"Original Contract Price","type":"currency","required":true},
      {"key":"assignment_fee","label":"Assignment Fee","type":"currency","required":true},
      {"key":"closing_date","label":"Closing Date","type":"date","required":true},
      {"key":"escrow_company","label":"Escrow / Title Company","type":"text","required":false}
    ]'::jsonb,
    '[
      {"id":"A1","title":"Parties and Property","text":"This Assignment Agreement is entered by and between Assignor and Assignee regarding the property identified in the form fields."},
      {"id":"A2","title":"Assigned Rights","text":"Assignor assigns all rights, title, and interest in the underlying purchase contract to Assignee."},
      {"id":"A3","title":"Assignment Consideration and Net Payout","text":"Assignee shall pay the Assignment Fee shown in this agreement. Net payout at closing = Assignment Fee - Platform Fee (1.5% of Assignment Fee)."},
      {"id":"A4","title":"Earnest Money and Deposits","text":"Any earnest money obligations after assignment are the responsibility of Assignee unless otherwise stated."},
      {"id":"A5","title":"As-Is Condition","text":"Assignee accepts property in current as-is condition and has conducted independent due diligence."},
      {"id":"A6","title":"Default and Remedies","text":"If either party defaults, non-defaulting party may pursue contractual and legal remedies permitted by law."},
      {"id":"A7","title":"No Brokerage Representation","text":"Parties acknowledge this assignment is not a brokerage representation unless separately documented."},
      {"id":"A8","title":"Electronic Signatures","text":"Electronic signatures and audit logs are binding and enforceable to the fullest extent permitted by law."}
    ]'::jsonb,
    true
  ),
  (
    '00000000-0000-0000-0000-000000005002',
    'cash-purchase-v1',
    'cash_purchase',
    'Cash Purchase Agreement (Investor)',
    'Direct investor purchase agreement for all-cash acquisitions.',
    '[
      {"key":"buyer_name","label":"Buyer Name","type":"text","required":true},
      {"key":"seller_name","label":"Seller Name","type":"text","required":true},
      {"key":"property_address","label":"Property Address","type":"text","required":true},
      {"key":"purchase_price","label":"Purchase Price","type":"currency","required":true},
      {"key":"earnest_money","label":"Earnest Money Deposit","type":"currency","required":true},
      {"key":"inspection_period_days","label":"Inspection Period (Days)","type":"number","required":true},
      {"key":"closing_date","label":"Closing Date","type":"date","required":true}
    ]'::jsonb,
    '[
      {"id":"C1","title":"Purchase and Sale","text":"Seller agrees to sell and Buyer agrees to purchase the property under the terms set forth herein."},
      {"id":"C2","title":"Purchase Price and Deposit","text":"Buyer shall pay purchase price and deliver earnest money deposit as stated in the form fields."},
      {"id":"C3","title":"Inspection Contingency","text":"Buyer has the stated inspection period to inspect the property and may cancel per contract terms."},
      {"id":"C4","title":"Title and Closing","text":"Seller shall provide marketable title at closing via agreed escrow and title providers."},
      {"id":"C5","title":"Prorations and Closing Costs","text":"Taxes, utilities, and closing costs are allocated according to local custom unless otherwise stated."},
      {"id":"C6","title":"Risk of Loss","text":"Risk of loss remains with Seller until closing unless otherwise required by law."},
      {"id":"C7","title":"Electronic Execution","text":"Digital signatures, timestamps, and IP-based audit evidence are accepted by both parties."}
    ]'::jsonb,
    true
  ),
  (
    '00000000-0000-0000-0000-000000005003',
    'joint-venture-v1',
    'joint_venture',
    'Joint Venture Agreement (Flip Partnership)',
    'Template for capital and operations partnerships on renovation projects.',
    '[
      {"key":"partner_a_name","label":"Partner A Name","type":"text","required":true},
      {"key":"partner_b_name","label":"Partner B Name","type":"text","required":true},
      {"key":"project_address","label":"Project Address","type":"text","required":true},
      {"key":"capital_contribution_a","label":"Capital Contribution A","type":"currency","required":true},
      {"key":"capital_contribution_b","label":"Capital Contribution B","type":"currency","required":true},
      {"key":"profit_split","label":"Profit Split (%)","type":"text","required":true}
    ]'::jsonb,
    '[
      {"id":"J1","title":"Venture Purpose","text":"Parties agree to jointly acquire, renovate, and dispose of the project property for profit."},
      {"id":"J2","title":"Capital Contributions","text":"Each partner shall contribute capital as specified in this agreement and supporting schedules."},
      {"id":"J3","title":"Management Duties","text":"Operational responsibilities, approvals, and reporting obligations are allocated between partners."},
      {"id":"J4","title":"Profit and Loss Allocation","text":"Profits and losses are distributed according to the stated split after repayment of approved expenses."},
      {"id":"J5","title":"Term and Exit","text":"The venture remains active until project sale and final distribution unless terminated earlier by mutual consent."},
      {"id":"J6","title":"Dispute Resolution and Governing Law","text":"Parties agree to negotiate in good faith and follow agreed dispute resolution and governing law provisions."}
    ]'::jsonb,
    true
  )
on conflict (id) do nothing;

insert into public.contractor_job_leads (
  id,
  contractor_id,
  listing_id,
  created_by,
  trade_required,
  city,
  budget_min,
  budget_max,
  notes,
  status
) values
  (
    '00000000-0000-0000-0000-000000006001',
    null,
    '00000000-0000-0000-0000-000000004001',
    '00000000-0000-0000-0000-000000000010',
    'Plumbing',
    'Sacramento',
    3000,
    9000,
    'Need full repipe estimate and fixture reset within 10 days.',
    'open'
  ),
  (
    '00000000-0000-0000-0000-000000006002',
    null,
    '00000000-0000-0000-0000-000000004004',
    '00000000-0000-0000-0000-000000000010',
    'Electrical',
    'Modesto',
    4500,
    12500,
    'Panel upgrade and kitchen circuit additions.',
    'open'
  ),
  (
    '00000000-0000-0000-0000-000000006003',
    null,
    '00000000-0000-0000-0000-000000004006',
    '00000000-0000-0000-0000-000000000010',
    'Flooring',
    'Bakersfield',
    3500,
    8000,
    'Install LVP throughout living areas plus bathrooms tile.',
    'open'
  )
on conflict (id) do nothing;
