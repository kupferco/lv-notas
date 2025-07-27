--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18
-- Dumped by pg_dump version 14.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_type AS ENUM (
    'new',
    'update',
    'cancel'
);


ALTER TYPE public.event_type OWNER TO postgres;

--
-- Name: session_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.session_status AS ENUM (
    'agendada',
    'compareceu',
    'cancelada'
);


ALTER TYPE public.session_status OWNER TO postgres;

--
-- Name: can_void_billing_period(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_void_billing_period(period_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM monthly_billing_periods 
        WHERE id = period_id 
        AND status != 'void' 
        AND can_be_voided = true
    );
END;
$$;


ALTER FUNCTION public.can_void_billing_period(period_id integer) OWNER TO postgres;

--
-- Name: change_patient_billing_cycle(integer, character varying, numeric, date, text, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.change_patient_billing_cycle(p_patient_id integer, p_new_billing_cycle character varying, p_new_session_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_history_id INTEGER;
    patient_therapist_id INTEGER;
BEGIN
    -- Get therapist_id for this patient
    SELECT therapist_id INTO patient_therapist_id FROM patients WHERE id = p_patient_id;
    
    -- Close current patient billing override (if any)
    UPDATE patient_billing_history
    SET effective_until_date = p_effective_from_date - INTERVAL '1 day'
    WHERE patient_id = p_patient_id
        AND effective_until_date IS NULL;
    
    -- Insert new patient billing history
    INSERT INTO patient_billing_history (
        patient_id,
        therapist_id,
        billing_cycle,
        session_price,
        effective_from_date,
        reason_for_change,
        created_by,
        notes
    ) VALUES (
        p_patient_id,
        patient_therapist_id,
        p_new_billing_cycle,
        p_new_session_price,
        p_effective_from_date,
        p_reason,
        p_created_by,
        p_notes
    ) RETURNING id INTO new_history_id;
    
    -- Update patient table with current values (for quick access)
    UPDATE patients
    SET session_price = p_new_session_price
    WHERE id = p_patient_id;
    
    RETURN new_history_id;
END;
$$;


ALTER FUNCTION public.change_patient_billing_cycle(p_patient_id integer, p_new_billing_cycle character varying, p_new_session_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text) OWNER TO postgres;

--
-- Name: FUNCTION change_patient_billing_cycle(p_patient_id integer, p_new_billing_cycle character varying, p_new_session_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.change_patient_billing_cycle(p_patient_id integer, p_new_billing_cycle character varying, p_new_session_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text) IS 'Change patient-specific billing with history tracking';


--
-- Name: change_therapist_billing_cycle(integer, character varying, numeric, date, text, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.change_therapist_billing_cycle(p_therapist_id integer, p_new_billing_cycle character varying, p_new_default_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_history_id INTEGER;
BEGIN
    -- Close current billing cycle (set effective_until_date)
    UPDATE therapist_billing_history
    SET effective_until_date = p_effective_from_date - INTERVAL '1 day'
    WHERE therapist_id = p_therapist_id
        AND effective_until_date IS NULL;
    
    -- Insert new billing cycle history
    INSERT INTO therapist_billing_history (
        therapist_id,
        billing_cycle,
        default_session_price,
        effective_from_date,
        reason_for_change,
        created_by,
        notes
    ) VALUES (
        p_therapist_id,
        p_new_billing_cycle,
        p_new_default_price,
        p_effective_from_date,
        p_reason,
        p_created_by,
        p_notes
    ) RETURNING id INTO new_history_id;
    
    -- Update therapist table with current values (for quick access)
    UPDATE therapists
    SET 
        billing_cycle = p_new_billing_cycle,
        default_session_price = p_new_default_price
    WHERE id = p_therapist_id;
    
    RETURN new_history_id;
END;
$$;


ALTER FUNCTION public.change_therapist_billing_cycle(p_therapist_id integer, p_new_billing_cycle character varying, p_new_default_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text) OWNER TO postgres;

--
-- Name: FUNCTION change_therapist_billing_cycle(p_therapist_id integer, p_new_billing_cycle character varying, p_new_default_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.change_therapist_billing_cycle(p_therapist_id integer, p_new_billing_cycle character varying, p_new_default_price numeric, p_effective_from_date date, p_reason text, p_created_by character varying, p_notes text) IS 'Change therapist billing cycle with history tracking';


--
-- Name: extract_patient_name_from_summary(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_patient_name_from_summary(summary text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
BEGIN
    -- Handle "Sessão - Patient Name" format
    IF summary ~* '^sessão\s*-\s*(.+)$' THEN
        RETURN TRIM(REGEXP_REPLACE(summary, '^sessão\s*-\s*', '', 'i'));
    END IF;
    
    -- Handle "Patient Name - Sessão" format
    IF summary ~* '^(.+)\s*-\s*sessão$' THEN
        RETURN TRIM(REGEXP_REPLACE(summary, '\s*-\s*sessão$', '', 'i'));
    END IF;
    
    -- Handle just patient name (if marked as therapy session)
    RETURN TRIM(summary);
END;
$_$;


ALTER FUNCTION public.extract_patient_name_from_summary(summary text) OWNER TO postgres;

--
-- Name: FUNCTION extract_patient_name_from_summary(summary text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.extract_patient_name_from_summary(summary text) IS 'Extract patient name from calendar event summary text';


--
-- Name: get_billing_sessions_count(integer, integer, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_billing_sessions_count(p_therapist_id integer, p_patient_id integer, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    session_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO session_count
    FROM billable_sessions bs
    WHERE bs.therapist_id = p_therapist_id
        AND bs.patient_id = p_patient_id
        AND bs.counts_for_billing = true
        AND bs.status = 'compareceu'
        AND (p_start_date IS NULL OR bs.date::date >= p_start_date)
        AND (p_end_date IS NULL OR bs.date::date <= p_end_date);
    
    RETURN COALESCE(session_count, 0);
END;
$$;


ALTER FUNCTION public.get_billing_sessions_count(p_therapist_id integer, p_patient_id integer, p_start_date date, p_end_date date) OWNER TO postgres;

--
-- Name: FUNCTION get_billing_sessions_count(p_therapist_id integer, p_patient_id integer, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_billing_sessions_count(p_therapist_id integer, p_patient_id integer, p_start_date date, p_end_date date) IS 'Calculate billable sessions count for a patient within date range';


--
-- Name: get_monthly_billing_summary(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_monthly_billing_summary(therapist_email character varying, summary_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE), summary_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE)) RETURNS TABLE(patient_name character varying, patient_id integer, billing_period_id integer, session_count integer, total_amount numeric, status character varying, has_payment boolean, processed_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.nome as patient_name,
        p.id as patient_id,
        bp.id as billing_period_id,
        bp.session_count,
        bp.total_amount,
        bp.status,
        EXISTS(SELECT 1 FROM monthly_billing_payments pay WHERE pay.billing_period_id = bp.id) as has_payment,
        bp.processed_at
    FROM monthly_billing_periods bp
    JOIN patients p ON bp.patient_id = p.id
    JOIN therapists t ON bp.therapist_id = t.id
    WHERE t.email = therapist_email
    AND bp.billing_year = summary_year
    AND bp.billing_month = summary_month
    AND bp.status != 'void'
    ORDER BY p.nome;
END;
$$;


ALTER FUNCTION public.get_monthly_billing_summary(therapist_email character varying, summary_year integer, summary_month integer) OWNER TO postgres;

--
-- Name: FUNCTION get_monthly_billing_summary(therapist_email character varying, summary_year integer, summary_month integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_monthly_billing_summary(therapist_email character varying, summary_year integer, summary_month integer) IS 'Get billing overview for therapist for specific month';


--
-- Name: get_patient_billing_cycle(integer, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_patient_billing_cycle(p_patient_id integer, p_date date DEFAULT CURRENT_DATE) RETURNS TABLE(billing_cycle character varying, session_price numeric, effective_from_date date, is_override boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    patient_therapist_id INTEGER;
BEGIN
    -- Get the therapist for this patient
    SELECT therapist_id INTO patient_therapist_id FROM patients WHERE id = p_patient_id;
    
    -- First check for patient-specific overrides
    RETURN QUERY
    SELECT 
        pbh.billing_cycle,
        pbh.session_price,
        pbh.effective_from_date,
        true as is_override
    FROM patient_billing_history pbh
    WHERE pbh.patient_id = p_patient_id
        AND pbh.effective_from_date <= p_date
        AND (pbh.effective_until_date IS NULL OR pbh.effective_until_date >= p_date)
    ORDER BY pbh.effective_from_date DESC
    LIMIT 1;
    
    -- If no patient override, use therapist default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            therapy_cycle.billing_cycle,
            therapy_cycle.default_session_price,
            therapy_cycle.effective_from_date,
            false as is_override
        FROM get_therapist_billing_cycle(patient_therapist_id, p_date) therapy_cycle;
    END IF;
END;
$$;


ALTER FUNCTION public.get_patient_billing_cycle(p_patient_id integer, p_date date) OWNER TO postgres;

--
-- Name: FUNCTION get_patient_billing_cycle(p_patient_id integer, p_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_patient_billing_cycle(p_patient_id integer, p_date date) IS 'Get billing cycle for patient with override support';


--
-- Name: get_therapist_billing_cycle(integer, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_therapist_billing_cycle(p_therapist_id integer, p_date date DEFAULT CURRENT_DATE) RETURNS TABLE(billing_cycle character varying, default_session_price numeric, effective_from_date date)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tbh.billing_cycle,
        tbh.default_session_price,
        tbh.effective_from_date
    FROM therapist_billing_history tbh
    WHERE tbh.therapist_id = p_therapist_id
        AND tbh.effective_from_date <= p_date
        AND (tbh.effective_until_date IS NULL OR tbh.effective_until_date >= p_date)
    ORDER BY tbh.effective_from_date DESC
    LIMIT 1;
    
    -- If no history record exists, return the default from therapists table
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            t.billing_cycle,
            t.default_session_price,
            CURRENT_DATE as effective_from_date
        FROM therapists t
        WHERE t.id = p_therapist_id;
    END IF;
END;
$$;


ALTER FUNCTION public.get_therapist_billing_cycle(p_therapist_id integer, p_date date) OWNER TO postgres;

--
-- Name: FUNCTION get_therapist_billing_cycle(p_therapist_id integer, p_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_therapist_billing_cycle(p_therapist_id integer, p_date date) IS 'Get current billing cycle configuration for therapist';


--
-- Name: get_therapist_setting(integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_default_value character varying DEFAULT NULL::character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    setting_value VARCHAR(255);
BEGIN
    SELECT ts.setting_value
    INTO setting_value
    FROM therapist_settings ts
    WHERE ts.therapist_id = p_therapist_id
        AND ts.setting_key = p_setting_key;
    
    RETURN COALESCE(setting_value, p_default_value);
END;
$$;


ALTER FUNCTION public.get_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_default_value character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_default_value character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_default_value character varying) IS 'Get therapist UI setting with default fallback';


--
-- Name: set_therapist_setting(integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_setting_value character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO therapist_settings (therapist_id, setting_key, setting_value, updated_at)
    VALUES (p_therapist_id, p_setting_key, p_setting_value, CURRENT_TIMESTAMP)
    ON CONFLICT (therapist_id, setting_key)
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;


ALTER FUNCTION public.set_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_setting_value character varying) OWNER TO postgres;

--
-- Name: FUNCTION set_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_setting_value character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_therapist_setting(p_therapist_id integer, p_setting_key character varying, p_setting_value character varying) IS 'Set or update therapist UI setting (upsert)';


--
-- Name: update_billing_period_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_billing_period_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Payment added: mark period as paid and prevent voiding
        UPDATE monthly_billing_periods 
        SET 
            status = 'paid',
            can_be_voided = false
        WHERE id = NEW.billing_period_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Payment deleted: check if any payments remain
        IF NOT EXISTS (
            SELECT 1 FROM monthly_billing_payments 
            WHERE billing_period_id = OLD.billing_period_id
        ) THEN
            -- No payments left: allow voiding again
            UPDATE monthly_billing_periods 
            SET 
                status = 'processed',
                can_be_voided = true
            WHERE id = OLD.billing_period_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_billing_period_status() OWNER TO postgres;

--
-- Name: void_billing_period(integer, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.void_billing_period(period_id integer, voided_by_email character varying, reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if period can be voided
    IF NOT can_void_billing_period(period_id) THEN
        RETURN false;
    END IF;
    
    -- Void the period
    UPDATE monthly_billing_periods 
    SET 
        status = 'void',
        can_be_voided = false,
        voided_at = CURRENT_TIMESTAMP,
        voided_by = voided_by_email,
        void_reason = reason
    WHERE id = period_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION public.void_billing_period(period_id integer, voided_by_email character varying, reason text) OWNER TO postgres;

--
-- Name: FUNCTION void_billing_period(period_id integer, voided_by_email character varying, reason text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.void_billing_period(period_id integer, voided_by_email character varying, reason text) IS 'Safely void a billing period with audit trail (only if no payments exist)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_configuration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_configuration (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.app_configuration OWNER TO postgres;

--
-- Name: TABLE app_configuration; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.app_configuration IS 'Global application configuration settings';


--
-- Name: COLUMN app_configuration.key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.app_configuration.key IS 'Global setting key: calendar_mode, app_version, etc.';


--
-- Name: COLUMN app_configuration.value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.app_configuration.value IS 'Global setting value stored as string';


--
-- Name: app_configuration_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_configuration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.app_configuration_id_seq OWNER TO postgres;

--
-- Name: app_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_configuration_id_seq OWNED BY public.app_configuration.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255),
    telefone character varying(20),
    cpf character varying(14),
    nota boolean DEFAULT false,
    preco numeric(10,2),
    therapist_id integer,
    therapy_start_date date,
    lv_notas_billing_start_date date,
    session_price numeric(10,2),
    recurring_pattern character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: TABLE patients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patients IS 'Patient records with dual date system for therapy vs billing tracking and CPF support';


--
-- Name: COLUMN patients.cpf; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patients.cpf IS 'Brazilian CPF (Cadastro de Pessoas Físicas) - format XXX.XXX.XXX-XX';


--
-- Name: COLUMN patients.therapy_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patients.therapy_start_date IS 'Historical date when therapy actually began (optional, for context only)';


--
-- Name: COLUMN patients.lv_notas_billing_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patients.lv_notas_billing_start_date IS 'Date when LV Notas billing begins (required, affects billing calculations)';


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    date timestamp with time zone NOT NULL,
    google_calendar_event_id character varying(255),
    patient_id integer,
    therapist_id integer,
    status public.session_status DEFAULT 'agendada'::public.session_status,
    billable boolean DEFAULT true,
    billing_period character varying(20),
    session_price numeric(10,2),
    billing_cycle_used character varying(20),
    created_during_onboarding boolean DEFAULT false,
    import_batch_id character varying(255),
    payment_requested boolean DEFAULT false,
    payment_request_date timestamp with time zone,
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    paid_date timestamp with time zone,
    billing_period_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sessions IS 'Therapy sessions with billing and payment tracking';


--
-- Name: COLUMN sessions.billable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sessions.billable IS 'Whether this session counts toward billing (based on billing start date)';


--
-- Name: COLUMN sessions.created_during_onboarding; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sessions.created_during_onboarding IS 'Was this session created during the onboarding import process';


--
-- Name: COLUMN sessions.payment_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sessions.payment_status IS 'Current payment status: pending, paid, overdue, etc.';


--
-- Name: billable_sessions; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.billable_sessions AS
 SELECT s.id,
    s.date,
    s.google_calendar_event_id,
    s.patient_id,
    s.therapist_id,
    s.status,
    s.billable,
    s.billing_period,
    s.session_price,
    s.billing_cycle_used,
    s.created_during_onboarding,
    s.import_batch_id,
    s.payment_requested,
    s.payment_request_date,
    s.payment_status,
    s.paid_date,
    s.billing_period_id,
    s.created_at,
    p.lv_notas_billing_start_date,
        CASE
            WHEN ((s.date)::date >= p.lv_notas_billing_start_date) THEN true
            ELSE false
        END AS counts_for_billing
   FROM (public.sessions s
     JOIN public.patients p ON ((s.patient_id = p.id)))
  WHERE (s.billable = true);


ALTER TABLE public.billable_sessions OWNER TO postgres;

--
-- Name: VIEW billable_sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.billable_sessions IS 'Sessions that count for billing based on LV Notas billing start date';


--
-- Name: patient_billing_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_billing_history (
    id integer NOT NULL,
    patient_id integer,
    therapist_id integer,
    billing_cycle character varying(20) NOT NULL,
    session_price numeric(10,2),
    effective_from_date date NOT NULL,
    effective_until_date date,
    reason_for_change text,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


ALTER TABLE public.patient_billing_history OWNER TO postgres;

--
-- Name: TABLE patient_billing_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patient_billing_history IS 'Patient-specific billing overrides with full history';


--
-- Name: COLUMN patient_billing_history.effective_until_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_billing_history.effective_until_date IS 'NULL means this is the current active override';


--
-- Name: therapist_billing_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.therapist_billing_history (
    id integer NOT NULL,
    therapist_id integer,
    billing_cycle character varying(20) NOT NULL,
    default_session_price numeric(10,2),
    effective_from_date date NOT NULL,
    effective_until_date date,
    reason_for_change text,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


ALTER TABLE public.therapist_billing_history OWNER TO postgres;

--
-- Name: TABLE therapist_billing_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.therapist_billing_history IS 'Complete history of billing cycle changes for therapists';


--
-- Name: COLUMN therapist_billing_history.effective_until_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.therapist_billing_history.effective_until_date IS 'NULL means this is the current active billing cycle';


--
-- Name: therapists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.therapists (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255),
    telefone character varying(20),
    google_calendar_id character varying(255),
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
    default_session_price numeric(10,2),
    onboarding_completed boolean DEFAULT false,
    onboarding_started_at timestamp with time zone,
    onboarding_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.therapists OWNER TO postgres;

--
-- Name: TABLE therapists; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.therapists IS 'Core therapist accounts with billing and onboarding configuration';


--
-- Name: billing_change_history; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.billing_change_history AS
 SELECT 'therapist'::text AS change_type,
    tbh.id AS history_id,
    tbh.therapist_id,
    NULL::integer AS patient_id,
    t.nome AS therapist_name,
    NULL::character varying AS patient_name,
    tbh.billing_cycle,
    tbh.default_session_price AS price,
    tbh.effective_from_date,
    tbh.effective_until_date,
    tbh.reason_for_change,
    tbh.created_by,
    tbh.created_at,
    tbh.notes
   FROM (public.therapist_billing_history tbh
     JOIN public.therapists t ON ((tbh.therapist_id = t.id)))
UNION ALL
 SELECT 'patient'::text AS change_type,
    pbh.id AS history_id,
    pbh.therapist_id,
    pbh.patient_id,
    t.nome AS therapist_name,
    p.nome AS patient_name,
    pbh.billing_cycle,
    pbh.session_price AS price,
    pbh.effective_from_date,
    pbh.effective_until_date,
    pbh.reason_for_change,
    pbh.created_by,
    pbh.created_at,
    pbh.notes
   FROM ((public.patient_billing_history pbh
     JOIN public.therapists t ON ((pbh.therapist_id = t.id)))
     JOIN public.patients p ON ((pbh.patient_id = p.id)))
  ORDER BY 13 DESC;


ALTER TABLE public.billing_change_history OWNER TO postgres;

--
-- Name: VIEW billing_change_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.billing_change_history IS 'Complete history of all billing changes for therapists and patients';


--
-- Name: billing_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_periods (
    id integer NOT NULL,
    therapist_id integer,
    patient_id integer,
    billing_cycle character varying(20) NOT NULL,
    period_start_date date NOT NULL,
    period_end_date date NOT NULL,
    total_sessions integer DEFAULT 0,
    billable_sessions integer DEFAULT 0,
    total_amount numeric(10,2) DEFAULT 0.00,
    invoice_generated boolean DEFAULT false,
    invoice_sent boolean DEFAULT false,
    invoice_paid boolean DEFAULT false,
    invoice_date date,
    payment_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.billing_periods OWNER TO postgres;

--
-- Name: TABLE billing_periods; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.billing_periods IS 'Actual billing periods and invoice tracking';


--
-- Name: COLUMN billing_periods.billable_sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.billing_periods.billable_sessions IS 'Sessions that count for billing (after LV Notas start date)';


--
-- Name: billing_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.billing_periods_id_seq OWNER TO postgres;

--
-- Name: billing_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_periods_id_seq OWNED BY public.billing_periods.id;


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_events (
    id integer NOT NULL,
    event_type public.event_type NOT NULL,
    google_event_id character varying(255) NOT NULL,
    session_date timestamp with time zone NOT NULL,
    email character varying(255),
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- Name: TABLE calendar_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.calendar_events IS 'Log of calendar events for sync tracking';


--
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.calendar_events_id_seq OWNER TO postgres;

--
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- Name: calendar_webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_webhooks (
    id integer NOT NULL,
    channel_id character varying(255) NOT NULL,
    resource_id character varying(255) NOT NULL,
    expiration timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.calendar_webhooks OWNER TO postgres;

--
-- Name: TABLE calendar_webhooks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.calendar_webhooks IS 'Active Google Calendar webhook subscriptions';


--
-- Name: calendar_webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendar_webhooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.calendar_webhooks_id_seq OWNER TO postgres;

--
-- Name: calendar_webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendar_webhooks_id_seq OWNED BY public.calendar_webhooks.id;


--
-- Name: check_ins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.check_ins (
    id integer NOT NULL,
    patient_id integer,
    session_id integer,
    session_date timestamp with time zone,
    created_by character varying(255) NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(10) DEFAULT 'compareceu'::character varying
);


ALTER TABLE public.check_ins OWNER TO postgres;

--
-- Name: TABLE check_ins; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.check_ins IS 'Patient attendance records';


--
-- Name: check_ins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.check_ins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.check_ins_id_seq OWNER TO postgres;

--
-- Name: check_ins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.check_ins_id_seq OWNED BY public.check_ins.id;


--
-- Name: current_billing_settings; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.current_billing_settings AS
 SELECT p.id AS patient_id,
    p.nome AS patient_name,
    p.therapist_id,
    t.nome AS therapist_name,
    t.email AS therapist_email,
    t.billing_cycle AS current_billing_cycle,
    COALESCE(p.session_price, t.default_session_price) AS current_session_price,
        CASE
            WHEN (p.session_price IS NOT NULL) THEN true
            ELSE false
        END AS has_patient_override,
    p.lv_notas_billing_start_date,
    ( SELECT count(*) AS count
           FROM public.sessions s
          WHERE ((s.patient_id = p.id) AND (s.billable = true) AND (s.status = 'compareceu'::public.session_status) AND (p.lv_notas_billing_start_date IS NOT NULL) AND ((s.date)::date >= p.lv_notas_billing_start_date))) AS total_billable_sessions
   FROM (public.patients p
     JOIN public.therapists t ON ((p.therapist_id = t.id)));


ALTER TABLE public.current_billing_settings OWNER TO postgres;

--
-- Name: VIEW current_billing_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.current_billing_settings IS 'Current billing configuration for all patients with session counts';


--
-- Name: imported_calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imported_calendar_events (
    id integer NOT NULL,
    therapist_id integer,
    google_event_id character varying(255) NOT NULL,
    original_summary character varying(500),
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    attendees_emails text[],
    is_therapy_session boolean DEFAULT false,
    is_recurring boolean DEFAULT false,
    recurring_rule text,
    linked_patient_id integer,
    matched_patient_name character varying(255),
    processed boolean DEFAULT false,
    import_batch_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone
);


ALTER TABLE public.imported_calendar_events OWNER TO postgres;

--
-- Name: TABLE imported_calendar_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.imported_calendar_events IS 'Calendar events imported during onboarding for processing';


--
-- Name: imported_calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.imported_calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.imported_calendar_events_id_seq OWNER TO postgres;

--
-- Name: imported_calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.imported_calendar_events_id_seq OWNED BY public.imported_calendar_events.id;


--
-- Name: monthly_billing_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_billing_payments (
    id integer NOT NULL,
    billing_period_id integer,
    therapist_id integer,
    patient_id integer,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50),
    payment_date timestamp with time zone NOT NULL,
    reference_number character varying(255),
    recorded_by character varying(255) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.monthly_billing_payments OWNER TO postgres;

--
-- Name: TABLE monthly_billing_payments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.monthly_billing_payments IS 'Actual payments received for billing periods';


--
-- Name: monthly_billing_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.monthly_billing_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.monthly_billing_payments_id_seq OWNER TO postgres;

--
-- Name: monthly_billing_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.monthly_billing_payments_id_seq OWNED BY public.monthly_billing_payments.id;


--
-- Name: monthly_billing_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_billing_periods (
    id integer NOT NULL,
    therapist_id integer,
    patient_id integer,
    billing_year integer NOT NULL,
    billing_month integer NOT NULL,
    session_count integer DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    session_snapshots jsonb DEFAULT '[]'::jsonb NOT NULL,
    processed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_by character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'processed'::character varying,
    can_be_voided boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    voided_at timestamp with time zone,
    voided_by character varying(255),
    void_reason text
);


ALTER TABLE public.monthly_billing_periods OWNER TO postgres;

--
-- Name: TABLE monthly_billing_periods; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.monthly_billing_periods IS 'Monthly billing periods with immutable session snapshots from Google Calendar';


--
-- Name: COLUMN monthly_billing_periods.session_snapshots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.monthly_billing_periods.session_snapshots IS 'JSON array of session details from Google Calendar at processing time';


--
-- Name: COLUMN monthly_billing_periods.can_be_voided; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.monthly_billing_periods.can_be_voided IS 'False once any payment exists - prevents accidental voiding of paid periods';


--
-- Name: monthly_billing_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.monthly_billing_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.monthly_billing_periods_id_seq OWNER TO postgres;

--
-- Name: monthly_billing_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.monthly_billing_periods_id_seq OWNED BY public.monthly_billing_periods.id;


--
-- Name: patient_billing_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_billing_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.patient_billing_history_id_seq OWNER TO postgres;

--
-- Name: patient_billing_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_billing_history_id_seq OWNED BY public.patient_billing_history.id;


--
-- Name: patient_matching_candidates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_matching_candidates (
    id integer NOT NULL,
    therapist_id integer,
    import_batch_id character varying(255) NOT NULL,
    extracted_name character varying(255) NOT NULL,
    name_variations text[],
    email_addresses text[],
    event_count integer DEFAULT 0,
    first_session_date date,
    latest_session_date date,
    suggested_therapy_start_date date,
    suggested_billing_start_date date,
    confidence_score numeric(3,2) DEFAULT 0.0,
    manual_review_needed boolean DEFAULT false,
    created_patient_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.patient_matching_candidates OWNER TO postgres;

--
-- Name: TABLE patient_matching_candidates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patient_matching_candidates IS 'Smart patient detection and matching from calendar events';


--
-- Name: COLUMN patient_matching_candidates.suggested_therapy_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_matching_candidates.suggested_therapy_start_date IS 'AI-suggested historical therapy start date based on calendar history';


--
-- Name: COLUMN patient_matching_candidates.suggested_billing_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_matching_candidates.suggested_billing_start_date IS 'Default LV Notas billing start date (usually today)';


--
-- Name: patient_matching_candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_matching_candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.patient_matching_candidates_id_seq OWNER TO postgres;

--
-- Name: patient_matching_candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_matching_candidates_id_seq OWNED BY public.patient_matching_candidates.id;


--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.patients_id_seq OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_transactions (
    id integer NOT NULL,
    session_id integer,
    patient_id integer,
    therapist_id integer,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50),
    payment_date timestamp with time zone NOT NULL,
    reference_number character varying(255),
    notes text,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_transactions OWNER TO postgres;

--
-- Name: TABLE payment_transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_transactions IS 'Records of actual payments received from patients';


--
-- Name: COLUMN payment_transactions.payment_method; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_transactions.payment_method IS 'PIX, bank transfer, cash, credit card, etc.';


--
-- Name: payment_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.payment_overview AS
 SELECT s.id AS session_id,
    s.date AS session_date,
    s.session_price,
    s.payment_status,
    s.payment_requested,
    s.payment_request_date,
    s.paid_date,
    p.id AS patient_id,
    p.nome AS patient_name,
    p.telefone AS patient_phone,
    t.id AS therapist_id,
    t.nome AS therapist_name,
    t.email AS therapist_email,
    pt.id AS payment_transaction_id,
    pt.amount AS paid_amount,
    pt.payment_method,
    pt.payment_date,
    pt.reference_number,
    (CURRENT_DATE - (s.date)::date) AS days_since_session,
        CASE
            WHEN (s.payment_request_date IS NOT NULL) THEN (CURRENT_DATE - (s.payment_request_date)::date)
            ELSE NULL::integer
        END AS days_since_request,
        CASE
            WHEN ((s.payment_status)::text = 'paid'::text) THEN 'pago'::text
            WHEN (s.payment_requested = false) THEN 'nao_cobrado'::text
            WHEN ((s.payment_requested = true) AND (s.payment_request_date > (CURRENT_DATE - '7 days'::interval))) THEN 'aguardando_pagamento'::text
            WHEN ((s.payment_requested = true) AND (s.payment_request_date <= (CURRENT_DATE - '7 days'::interval))) THEN 'pendente'::text
            ELSE 'nao_cobrado'::text
        END AS payment_state
   FROM (((public.sessions s
     JOIN public.patients p ON ((s.patient_id = p.id)))
     JOIN public.therapists t ON ((s.therapist_id = t.id)))
     LEFT JOIN public.payment_transactions pt ON ((s.id = pt.session_id)))
  WHERE ((s.status = 'compareceu'::public.session_status) AND ((s.date)::date >= p.lv_notas_billing_start_date));


ALTER TABLE public.payment_overview OWNER TO postgres;

--
-- Name: VIEW payment_overview; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.payment_overview IS 'Complete payment status overview with calculated payment states';


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_requests (
    id integer NOT NULL,
    patient_id integer,
    therapist_id integer,
    session_ids integer[],
    total_amount numeric(10,2) NOT NULL,
    request_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    request_type character varying(20) DEFAULT 'invoice'::character varying,
    whatsapp_sent boolean DEFAULT false,
    whatsapp_message text,
    response_received boolean DEFAULT false,
    response_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_requests OWNER TO postgres;

--
-- Name: TABLE payment_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_requests IS 'Log of payment communications sent to patients (WhatsApp, email, etc.)';


--
-- Name: COLUMN payment_requests.session_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_requests.session_ids IS 'Array of session IDs included in this payment request';


--
-- Name: COLUMN payment_requests.whatsapp_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_requests.whatsapp_message IS 'The actual message content sent via WhatsApp';


--
-- Name: payment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.payment_requests_id_seq OWNER TO postgres;

--
-- Name: payment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_requests_id_seq OWNED BY public.payment_requests.id;


--
-- Name: payment_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_status_history (
    id integer NOT NULL,
    session_id integer,
    old_status character varying(50),
    new_status character varying(50),
    changed_by character varying(255),
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reason text,
    payment_transaction_id integer
);


ALTER TABLE public.payment_status_history OWNER TO postgres;

--
-- Name: TABLE payment_status_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_status_history IS 'Complete audit trail of payment status changes';


--
-- Name: payment_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.payment_status_history_id_seq OWNER TO postgres;

--
-- Name: payment_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_status_history_id_seq OWNED BY public.payment_status_history.id;


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.payment_transactions_id_seq OWNER TO postgres;

--
-- Name: payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_transactions_id_seq OWNED BY public.payment_transactions.id;


--
-- Name: recurring_session_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_session_templates (
    id integer NOT NULL,
    therapist_id integer,
    patient_id integer,
    day_of_week integer,
    start_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 60,
    frequency character varying(20) DEFAULT 'weekly'::character varying,
    effective_from date NOT NULL,
    effective_until date,
    status character varying(20) DEFAULT 'active'::character varying,
    created_from_import boolean DEFAULT false,
    import_batch_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.recurring_session_templates OWNER TO postgres;

--
-- Name: TABLE recurring_session_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.recurring_session_templates IS 'Detected recurring appointment patterns for automation';


--
-- Name: recurring_session_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recurring_session_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.recurring_session_templates_id_seq OWNER TO postgres;

--
-- Name: recurring_session_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recurring_session_templates_id_seq OWNED BY public.recurring_session_templates.id;


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: therapist_billing_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.therapist_billing_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.therapist_billing_history_id_seq OWNER TO postgres;

--
-- Name: therapist_billing_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.therapist_billing_history_id_seq OWNED BY public.therapist_billing_history.id;


--
-- Name: therapist_onboarding; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.therapist_onboarding (
    id integer NOT NULL,
    therapist_id integer,
    step character varying(50) NOT NULL,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    data jsonb,
    notes text
);


ALTER TABLE public.therapist_onboarding OWNER TO postgres;

--
-- Name: TABLE therapist_onboarding; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.therapist_onboarding IS 'Step-by-step tracking of therapist onboarding process';


--
-- Name: therapist_onboarding_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.therapist_onboarding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.therapist_onboarding_id_seq OWNER TO postgres;

--
-- Name: therapist_onboarding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.therapist_onboarding_id_seq OWNED BY public.therapist_onboarding.id;


--
-- Name: therapist_onboarding_progress; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.therapist_onboarding_progress AS
 SELECT t.id AS therapist_id,
    t.email,
    t.onboarding_completed,
    t.onboarding_started_at,
    t.onboarding_completed_at,
    COALESCE(json_agg(json_build_object('step', tog.step, 'completed_at', tog.completed_at, 'data', tog.data, 'notes', tog.notes) ORDER BY tog.completed_at) FILTER (WHERE (tog.step IS NOT NULL)), '[]'::json) AS completed_steps,
        CASE
            WHEN t.onboarding_completed THEN 'completed'::text
            WHEN (count(tog.step) = 0) THEN 'not_started'::text
            ELSE 'in_progress'::text
        END AS status
   FROM (public.therapists t
     LEFT JOIN public.therapist_onboarding tog ON ((t.id = tog.therapist_id)))
  GROUP BY t.id, t.email, t.onboarding_completed, t.onboarding_started_at, t.onboarding_completed_at;


ALTER TABLE public.therapist_onboarding_progress OWNER TO postgres;

--
-- Name: VIEW therapist_onboarding_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.therapist_onboarding_progress IS 'Complete onboarding status and progress for each therapist';


--
-- Name: therapist_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.therapist_settings (
    id integer NOT NULL,
    therapist_id integer,
    setting_key character varying(50) NOT NULL,
    setting_value character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.therapist_settings OWNER TO postgres;

--
-- Name: TABLE therapist_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.therapist_settings IS 'Stores persistent UI preferences for each therapist';


--
-- Name: COLUMN therapist_settings.setting_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.therapist_settings.setting_key IS 'Setting name: payment_mode, view_mode, auto_check_in_mode, etc.';


--
-- Name: COLUMN therapist_settings.setting_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.therapist_settings.setting_value IS 'Setting value stored as string (parse as needed)';


--
-- Name: therapist_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.therapist_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.therapist_settings_id_seq OWNER TO postgres;

--
-- Name: therapist_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.therapist_settings_id_seq OWNED BY public.therapist_settings.id;


--
-- Name: therapists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.therapists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.therapists_id_seq OWNER TO postgres;

--
-- Name: therapists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.therapists_id_seq OWNED BY public.therapists.id;


--
-- Name: app_configuration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_configuration ALTER COLUMN id SET DEFAULT nextval('public.app_configuration_id_seq'::regclass);


--
-- Name: billing_periods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_periods ALTER COLUMN id SET DEFAULT nextval('public.billing_periods_id_seq'::regclass);


--
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- Name: calendar_webhooks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_webhooks ALTER COLUMN id SET DEFAULT nextval('public.calendar_webhooks_id_seq'::regclass);


--
-- Name: check_ins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins ALTER COLUMN id SET DEFAULT nextval('public.check_ins_id_seq'::regclass);


--
-- Name: imported_calendar_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imported_calendar_events ALTER COLUMN id SET DEFAULT nextval('public.imported_calendar_events_id_seq'::regclass);


--
-- Name: monthly_billing_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_payments ALTER COLUMN id SET DEFAULT nextval('public.monthly_billing_payments_id_seq'::regclass);


--
-- Name: monthly_billing_periods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_periods ALTER COLUMN id SET DEFAULT nextval('public.monthly_billing_periods_id_seq'::regclass);


--
-- Name: patient_billing_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_billing_history ALTER COLUMN id SET DEFAULT nextval('public.patient_billing_history_id_seq'::regclass);


--
-- Name: patient_matching_candidates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_matching_candidates ALTER COLUMN id SET DEFAULT nextval('public.patient_matching_candidates_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: payment_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests ALTER COLUMN id SET DEFAULT nextval('public.payment_requests_id_seq'::regclass);


--
-- Name: payment_status_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_status_history ALTER COLUMN id SET DEFAULT nextval('public.payment_status_history_id_seq'::regclass);


--
-- Name: payment_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.payment_transactions_id_seq'::regclass);


--
-- Name: recurring_session_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_session_templates ALTER COLUMN id SET DEFAULT nextval('public.recurring_session_templates_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: therapist_billing_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_billing_history ALTER COLUMN id SET DEFAULT nextval('public.therapist_billing_history_id_seq'::regclass);


--
-- Name: therapist_onboarding id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_onboarding ALTER COLUMN id SET DEFAULT nextval('public.therapist_onboarding_id_seq'::regclass);


--
-- Name: therapist_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_settings ALTER COLUMN id SET DEFAULT nextval('public.therapist_settings_id_seq'::regclass);


--
-- Name: therapists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapists ALTER COLUMN id SET DEFAULT nextval('public.therapists_id_seq'::regclass);


--
-- Data for Name: app_configuration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_configuration (id, key, value, description, created_at, updated_at) FROM stdin;
1	calendar_mode	read_only	Calendar integration mode: read_only or read_write	2025-07-20 10:49:22.700982+00	2025-07-20 10:49:22.700982+00
2	app_version	1.0.0	Current application version	2025-07-20 10:49:22.700982+00	2025-07-20 10:49:22.700982+00
3	default_session_duration	60	Default session duration in minutes	2025-07-20 10:49:22.700982+00	2025-07-20 10:49:22.700982+00
4	calendar_sync_enabled	true	Whether calendar synchronization is enabled globally	2025-07-20 10:49:22.700982+00	2025-07-20 10:49:22.700982+00
\.


--
-- Data for Name: billing_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_periods (id, therapist_id, patient_id, billing_cycle, period_start_date, period_end_date, total_sessions, billable_sessions, total_amount, invoice_generated, invoice_sent, invoice_paid, invoice_date, payment_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_events (id, event_type, google_event_id, session_date, email, date) FROM stdin;
\.


--
-- Data for Name: calendar_webhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_webhooks (id, channel_id, resource_id, expiration, created_at) FROM stdin;
\.


--
-- Data for Name: check_ins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.check_ins (id, patient_id, session_id, session_date, created_by, date, status) FROM stdin;
\.


--
-- Data for Name: imported_calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imported_calendar_events (id, therapist_id, google_event_id, original_summary, description, start_time, end_time, attendees_emails, is_therapy_session, is_recurring, recurring_rule, linked_patient_id, matched_patient_name, processed, import_batch_id, created_at, processed_at) FROM stdin;
\.


--
-- Data for Name: monthly_billing_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_billing_payments (id, billing_period_id, therapist_id, patient_id, amount, payment_method, payment_date, reference_number, recorded_by, notes, created_at, updated_at) FROM stdin;
3	6	1	1	44400.00	pix	2025-07-21 00:00:00+00	Opcional	dnkupfer@gmail.com	\N	2025-07-21 17:11:49.393455+00	2025-07-21 17:11:49.393455+00
\.


--
-- Data for Name: monthly_billing_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_billing_periods (id, therapist_id, patient_id, billing_year, billing_month, session_count, total_amount, session_snapshots, processed_at, processed_by, status, can_be_voided, created_at, voided_at, voided_by, void_reason) FROM stdin;
6	1	1	2025	5	4	44400.00	[{"date": "2025-05-05", "time": "09:00", "duration": 60, "patientName": "Maria Santos", "googleEventId": "be525nb938vi65fnfq30oa53ro"}, {"date": "2025-05-12", "time": "09:00", "duration": 60, "patientName": "Maria Santos", "googleEventId": "46ltqavit5frr24ujpeql0ki60"}, {"date": "2025-05-19", "time": "09:00", "duration": 60, "patientName": "Maria Santos", "googleEventId": "u9ur8n0cllq3kfnis3p4nrirf8"}, {"date": "2025-05-26", "time": "09:00", "duration": 60, "patientName": "Maria Santos", "googleEventId": "c0tvh7io6v5t1s39qoioqkg2bo"}]	2025-07-21 17:09:39.350715+00	dnkupfer@gmail.com	paid	f	2025-07-21 17:09:39.350715+00	\N	\N	\N
\.


--
-- Data for Name: patient_billing_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_billing_history (id, patient_id, therapist_id, billing_cycle, session_price, effective_from_date, effective_until_date, reason_for_change, created_by, created_at, notes) FROM stdin;
\.


--
-- Data for Name: patient_matching_candidates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_matching_candidates (id, therapist_id, import_batch_id, extracted_name, name_variations, email_addresses, event_count, first_session_date, latest_session_date, suggested_therapy_start_date, suggested_billing_start_date, confidence_score, manual_review_needed, created_patient_id, created_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, nome, email, telefone, cpf, nota, preco, therapist_id, therapy_start_date, lv_notas_billing_start_date, session_price, recurring_pattern, notes, created_at) FROM stdin;
1	Maria Santos	maria.santos@hotmail.com	1234567890	123.456.789-09	f	11100.00	1	1976-12-05	2025-02-01	\N	\N	\N	2025-07-20 10:53:53.221996+00
8	sara citron	sarinhacitron@hotmail.com	11999397168	\N	f	45000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-24 13:52:41.948905+00
4	Carlos Alberto de Mattos Scaramuzza	cscaramuzza@gmail.com	11995081003	\N	f	35000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-22 18:51:58.433271+00
6	Fabio Bezerra	fabio@mfvchapas.com.br	996494187	\N	f	40000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-23 14:06:08.470337+00
7	Gabriela Schiavoni	valschiavoni@gmail.com	41995858885	\N	f	40000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-23 22:07:19.535285+00
5	Carol Wigman	carolinawigman@gmail.com	11966407792	\N	f	30000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-22 18:58:31.534689+00
9	Alexandre Pellaes	alexandrepellaes@exboss.com.br	11966501919	\N	f	33000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-25 18:01:10.241629+00
10	Aline de Melo Alves	alinedmeloalves@gmail.com	11976135115	\N	f	20000.00	2	\N	2023-07-01	\N	\N	\N	2025-07-25 18:05:31.030976+00
11	Andrea Quijo	andrea@espacopartager.com.br	11998114443	\N	f	25000.00	2	\N	2025-07-01	\N	\N	\N	2025-07-25 18:14:49.035511+00
\.


--
-- Data for Name: payment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_requests (id, patient_id, therapist_id, session_ids, total_amount, request_date, request_type, whatsapp_sent, whatsapp_message, response_received, response_date, created_at) FROM stdin;
\.


--
-- Data for Name: payment_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_status_history (id, session_id, old_status, new_status, changed_by, changed_at, reason, payment_transaction_id) FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_transactions (id, session_id, patient_id, therapist_id, amount, payment_method, payment_date, reference_number, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recurring_session_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recurring_session_templates (id, therapist_id, patient_id, day_of_week, start_time, duration_minutes, frequency, effective_from, effective_until, status, created_from_import, import_batch_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, date, google_calendar_event_id, patient_id, therapist_id, status, billable, billing_period, session_price, billing_cycle_used, created_during_onboarding, import_batch_id, payment_requested, payment_request_date, payment_status, paid_date, billing_period_id, created_at) FROM stdin;
\.


--
-- Data for Name: therapist_billing_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.therapist_billing_history (id, therapist_id, billing_cycle, default_session_price, effective_from_date, effective_until_date, reason_for_change, created_by, created_at, notes) FROM stdin;
\.


--
-- Data for Name: therapist_onboarding; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.therapist_onboarding (id, therapist_id, step, completed_at, data, notes) FROM stdin;
\.


--
-- Data for Name: therapist_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.therapist_settings (id, therapist_id, setting_key, setting_value, created_at, updated_at) FROM stdin;
1	1	payment_mode	simple	2025-07-21 20:52:31.527833+00	2025-07-21 20:52:31.527833+00
2	1	view_mode	list	2025-07-21 20:52:31.536236+00	2025-07-21 20:52:31.536236+00
3	1	auto_check_in_mode	false	2025-07-21 20:52:31.53993+00	2025-07-21 20:52:31.53993+00
\.


--
-- Data for Name: therapists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.therapists (id, nome, email, telefone, google_calendar_id, billing_cycle, default_session_price, onboarding_completed, onboarding_started_at, onboarding_completed_at, created_at) FROM stdin;
1	Daniel Kupfer	dnkupfer@gmail.com	\N	6f3842a5e7b8b63095e840cc28684fd52e17ff25ef173e49b2e5219ed676f652@group.calendar.google.com	monthly	\N	f	\N	\N	2025-07-20 10:53:04.540266+00
2	Cristina Kupfer	mcmkupfer@gmail.com	\N	mcmkupfer@gmail.com	monthly	\N	f	\N	\N	2025-07-21 13:24:01.28545+00
\.


--
-- Name: app_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_configuration_id_seq', 4, true);


--
-- Name: billing_periods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_periods_id_seq', 1, false);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calendar_events_id_seq', 1, false);


--
-- Name: calendar_webhooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calendar_webhooks_id_seq', 1, false);


--
-- Name: check_ins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.check_ins_id_seq', 1, false);


--
-- Name: imported_calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.imported_calendar_events_id_seq', 1, false);


--
-- Name: monthly_billing_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_billing_payments_id_seq', 3, true);


--
-- Name: monthly_billing_periods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_billing_periods_id_seq', 19, true);


--
-- Name: patient_billing_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_billing_history_id_seq', 1, false);


--
-- Name: patient_matching_candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_matching_candidates_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patients_id_seq', 11, true);


--
-- Name: payment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_requests_id_seq', 1, false);


--
-- Name: payment_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_status_history_id_seq', 1, false);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_transactions_id_seq', 1, false);


--
-- Name: recurring_session_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recurring_session_templates_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: therapist_billing_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.therapist_billing_history_id_seq', 1, false);


--
-- Name: therapist_onboarding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.therapist_onboarding_id_seq', 1, false);


--
-- Name: therapist_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.therapist_settings_id_seq', 3, true);


--
-- Name: therapists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.therapists_id_seq', 2, true);


--
-- Name: app_configuration app_configuration_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_configuration
    ADD CONSTRAINT app_configuration_key_key UNIQUE (key);


--
-- Name: app_configuration app_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_configuration
    ADD CONSTRAINT app_configuration_pkey PRIMARY KEY (id);


--
-- Name: billing_periods billing_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_pkey PRIMARY KEY (id);


--
-- Name: billing_periods billing_periods_therapist_id_patient_id_period_start_date_p_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_therapist_id_patient_id_period_start_date_p_key UNIQUE (therapist_id, patient_id, period_start_date, period_end_date);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: calendar_webhooks calendar_webhooks_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_webhooks
    ADD CONSTRAINT calendar_webhooks_channel_id_key UNIQUE (channel_id);


--
-- Name: calendar_webhooks calendar_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_webhooks
    ADD CONSTRAINT calendar_webhooks_pkey PRIMARY KEY (id);


--
-- Name: check_ins check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_pkey PRIMARY KEY (id);


--
-- Name: imported_calendar_events imported_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imported_calendar_events
    ADD CONSTRAINT imported_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: monthly_billing_payments monthly_billing_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_payments
    ADD CONSTRAINT monthly_billing_payments_pkey PRIMARY KEY (id);


--
-- Name: monthly_billing_periods monthly_billing_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_periods
    ADD CONSTRAINT monthly_billing_periods_pkey PRIMARY KEY (id);


--
-- Name: monthly_billing_periods monthly_billing_periods_therapist_id_patient_id_billing_yea_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_periods
    ADD CONSTRAINT monthly_billing_periods_therapist_id_patient_id_billing_yea_key UNIQUE (therapist_id, patient_id, billing_year, billing_month);


--
-- Name: patient_billing_history patient_billing_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_billing_history
    ADD CONSTRAINT patient_billing_history_pkey PRIMARY KEY (id);


--
-- Name: patient_matching_candidates patient_matching_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_matching_candidates
    ADD CONSTRAINT patient_matching_candidates_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_status_history payment_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_status_history
    ADD CONSTRAINT payment_status_history_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: recurring_session_templates recurring_session_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_session_templates
    ADD CONSTRAINT recurring_session_templates_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: therapist_billing_history therapist_billing_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_billing_history
    ADD CONSTRAINT therapist_billing_history_pkey PRIMARY KEY (id);


--
-- Name: therapist_onboarding therapist_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_onboarding
    ADD CONSTRAINT therapist_onboarding_pkey PRIMARY KEY (id);


--
-- Name: therapist_onboarding therapist_onboarding_therapist_id_step_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_onboarding
    ADD CONSTRAINT therapist_onboarding_therapist_id_step_key UNIQUE (therapist_id, step);


--
-- Name: therapist_settings therapist_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_settings
    ADD CONSTRAINT therapist_settings_pkey PRIMARY KEY (id);


--
-- Name: therapist_settings therapist_settings_therapist_id_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_settings
    ADD CONSTRAINT therapist_settings_therapist_id_setting_key_key UNIQUE (therapist_id, setting_key);


--
-- Name: therapists therapists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapists
    ADD CONSTRAINT therapists_pkey PRIMARY KEY (id);


--
-- Name: idx_app_configuration_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_app_configuration_key ON public.app_configuration USING btree (key);


--
-- Name: idx_billing_periods_patient_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_periods_patient_dates ON public.billing_periods USING btree (patient_id, period_start_date, period_end_date);


--
-- Name: idx_billing_periods_therapist_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_periods_therapist_dates ON public.billing_periods USING btree (therapist_id, period_start_date, period_end_date);


--
-- Name: idx_imported_events_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_imported_events_google_id ON public.imported_calendar_events USING btree (google_event_id);


--
-- Name: idx_imported_events_therapist_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_imported_events_therapist_batch ON public.imported_calendar_events USING btree (therapist_id, import_batch_id);


--
-- Name: idx_imported_events_therapy_sessions; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_imported_events_therapy_sessions ON public.imported_calendar_events USING btree (therapist_id, is_therapy_session);


--
-- Name: idx_matching_candidates_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matching_candidates_name ON public.patient_matching_candidates USING btree (extracted_name);


--
-- Name: idx_matching_candidates_therapist_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matching_candidates_therapist_batch ON public.patient_matching_candidates USING btree (therapist_id, import_batch_id);


--
-- Name: idx_monthly_billing_payments_billing_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_payments_billing_period ON public.monthly_billing_payments USING btree (billing_period_id);


--
-- Name: idx_monthly_billing_payments_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_payments_payment_date ON public.monthly_billing_payments USING btree (payment_date);


--
-- Name: idx_monthly_billing_payments_therapist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_payments_therapist ON public.monthly_billing_payments USING btree (therapist_id);


--
-- Name: idx_monthly_billing_periods_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_periods_month ON public.monthly_billing_periods USING btree (billing_year, billing_month);


--
-- Name: idx_monthly_billing_periods_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_periods_patient ON public.monthly_billing_periods USING btree (patient_id);


--
-- Name: idx_monthly_billing_periods_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_periods_status ON public.monthly_billing_periods USING btree (therapist_id, status);


--
-- Name: idx_monthly_billing_periods_therapist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_monthly_billing_periods_therapist ON public.monthly_billing_periods USING btree (therapist_id);


--
-- Name: idx_patient_billing_history_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_billing_history_dates ON public.patient_billing_history USING btree (patient_id, effective_from_date, effective_until_date);


--
-- Name: idx_patients_cpf; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_patients_cpf ON public.patients USING btree (cpf) WHERE (cpf IS NOT NULL);


--
-- Name: idx_patients_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_email ON public.patients USING btree (email);


--
-- Name: idx_patients_therapist_billing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_therapist_billing ON public.patients USING btree (therapist_id, lv_notas_billing_start_date);


--
-- Name: idx_patients_therapist_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_therapist_id ON public.patients USING btree (therapist_id);


--
-- Name: idx_payment_requests_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_patient_id ON public.payment_requests USING btree (patient_id);


--
-- Name: idx_payment_requests_request_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_request_date ON public.payment_requests USING btree (request_date);


--
-- Name: idx_payment_requests_therapist_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_therapist_id ON public.payment_requests USING btree (therapist_id);


--
-- Name: idx_payment_status_history_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_status_history_session_id ON public.payment_status_history USING btree (session_id);


--
-- Name: idx_payment_transactions_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_patient_id ON public.payment_transactions USING btree (patient_id);


--
-- Name: idx_payment_transactions_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_payment_date ON public.payment_transactions USING btree (payment_date);


--
-- Name: idx_payment_transactions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_session_id ON public.payment_transactions USING btree (session_id);


--
-- Name: idx_payment_transactions_therapist_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_therapist_id ON public.payment_transactions USING btree (therapist_id);


--
-- Name: idx_recurring_templates_schedule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recurring_templates_schedule ON public.recurring_session_templates USING btree (day_of_week, start_time);


--
-- Name: idx_recurring_templates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recurring_templates_status ON public.recurring_session_templates USING btree (therapist_id, status);


--
-- Name: idx_recurring_templates_therapist_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recurring_templates_therapist_patient ON public.recurring_session_templates USING btree (therapist_id, patient_id);


--
-- Name: idx_sessions_billable; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_billable ON public.sessions USING btree (therapist_id, billable, date);


--
-- Name: idx_sessions_billing_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_billing_period ON public.sessions USING btree (therapist_id, billing_period);


--
-- Name: idx_sessions_billing_period_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_billing_period_id ON public.sessions USING btree (billing_period_id);


--
-- Name: idx_sessions_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_patient_id ON public.sessions USING btree (patient_id);


--
-- Name: idx_sessions_payment_requested; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_payment_requested ON public.sessions USING btree (therapist_id, payment_requested, payment_request_date);


--
-- Name: idx_sessions_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_payment_status ON public.sessions USING btree (therapist_id, payment_status);


--
-- Name: idx_sessions_therapist_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_therapist_id ON public.sessions USING btree (therapist_id);


--
-- Name: idx_therapist_billing_history_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_therapist_billing_history_dates ON public.therapist_billing_history USING btree (therapist_id, effective_from_date, effective_until_date);


--
-- Name: idx_therapist_settings_therapist_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_therapist_settings_therapist_key ON public.therapist_settings USING btree (therapist_id, setting_key);


--
-- Name: idx_therapists_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_therapists_email ON public.therapists USING btree (email);


--
-- Name: monthly_billing_payments trigger_update_billing_status_on_payment_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_billing_status_on_payment_delete AFTER DELETE ON public.monthly_billing_payments FOR EACH ROW EXECUTE FUNCTION public.update_billing_period_status();


--
-- Name: monthly_billing_payments trigger_update_billing_status_on_payment_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_billing_status_on_payment_insert AFTER INSERT ON public.monthly_billing_payments FOR EACH ROW EXECUTE FUNCTION public.update_billing_period_status();


--
-- Name: billing_periods billing_periods_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: billing_periods billing_periods_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: check_ins check_ins_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: check_ins check_ins_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: imported_calendar_events imported_calendar_events_linked_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imported_calendar_events
    ADD CONSTRAINT imported_calendar_events_linked_patient_id_fkey FOREIGN KEY (linked_patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: imported_calendar_events imported_calendar_events_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imported_calendar_events
    ADD CONSTRAINT imported_calendar_events_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: monthly_billing_payments monthly_billing_payments_billing_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_payments
    ADD CONSTRAINT monthly_billing_payments_billing_period_id_fkey FOREIGN KEY (billing_period_id) REFERENCES public.monthly_billing_periods(id) ON DELETE CASCADE;


--
-- Name: monthly_billing_payments monthly_billing_payments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_payments
    ADD CONSTRAINT monthly_billing_payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: monthly_billing_payments monthly_billing_payments_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_payments
    ADD CONSTRAINT monthly_billing_payments_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: monthly_billing_periods monthly_billing_periods_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_periods
    ADD CONSTRAINT monthly_billing_periods_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: monthly_billing_periods monthly_billing_periods_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_billing_periods
    ADD CONSTRAINT monthly_billing_periods_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: patient_billing_history patient_billing_history_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_billing_history
    ADD CONSTRAINT patient_billing_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_billing_history patient_billing_history_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_billing_history
    ADD CONSTRAINT patient_billing_history_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: patient_matching_candidates patient_matching_candidates_created_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_matching_candidates
    ADD CONSTRAINT patient_matching_candidates_created_patient_id_fkey FOREIGN KEY (created_patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: patient_matching_candidates patient_matching_candidates_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_matching_candidates
    ADD CONSTRAINT patient_matching_candidates_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: patients patients_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: payment_status_history payment_status_history_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_status_history
    ADD CONSTRAINT payment_status_history_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id) ON DELETE SET NULL;


--
-- Name: payment_status_history payment_status_history_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_status_history
    ADD CONSTRAINT payment_status_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: recurring_session_templates recurring_session_templates_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_session_templates
    ADD CONSTRAINT recurring_session_templates_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: recurring_session_templates recurring_session_templates_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_session_templates
    ADD CONSTRAINT recurring_session_templates_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: therapist_billing_history therapist_billing_history_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_billing_history
    ADD CONSTRAINT therapist_billing_history_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: therapist_onboarding therapist_onboarding_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_onboarding
    ADD CONSTRAINT therapist_onboarding_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: therapist_settings therapist_settings_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.therapist_settings
    ADD CONSTRAINT therapist_settings_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: cloudsqlsuperuser
--

REVOKE ALL ON SCHEMA public FROM cloudsqladmin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

