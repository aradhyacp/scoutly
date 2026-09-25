The single source of truth for DataBase Schema

-- WARNING: This schema is for context only and is not meant to be run.

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_name text,
  source_url text UNIQUE,
  country_or_location text,
  team_size integer,
  industry text,
  description text,
  is_b2b boolean,
  is_b2c boolean,
  funding_rounds ARRAY,
  annual_revenue numeric,
  founded_year integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);