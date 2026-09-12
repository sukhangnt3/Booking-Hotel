CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

CREATE TYPE public.booking_payment_status_enum AS ENUM (
    'unpaid',
    'paid',
    'refunded'
);

CREATE TYPE public.booking_status_enum AS ENUM (
    'pending',
    'confirmed',
    'checked_in',
    'checked_out',
    'cancelled',
    'expired'
);

CREATE TYPE public.hotel_status_enum AS ENUM (
    'pending',
    'active',
    'rejected',
    'suspended'
);

CREATE TYPE public.payment_status_enum AS ENUM (
    'pending',
    'success',
    'failed'
);

CREATE TYPE public.payment_type_enum AS ENUM (
    'full',
    'deposit'
);

CREATE TYPE public.promotion_type_enum AS ENUM (
    'percentage',
    'fixed_amount',
    'amount',
    'fixed'
);

CREATE TYPE public.room_inventory_status_enum AS ENUM (
    'active',
    'closed'
);

CREATE TYPE public.transaction_status_enum AS ENUM (
    'pending',
    'success',
    'failed'
);

CREATE TABLE public.amenity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.booking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_code character varying(20) NOT NULL,
    user_id uuid,
    hotel_id uuid NOT NULL,
    promotion_id uuid,
    checkin_date date NOT NULL,
    checkout_date date NOT NULL,
    adult_total integer NOT NULL,
    children_total integer DEFAULT 0 NOT NULL,
    customer_name character varying(255) NOT NULL,
    guest_email character varying(255) NOT NULL,
    guest_phone character varying(20) NOT NULL,
    special_require text,
    status public.booking_status_enum DEFAULT 'pending'::public.booking_status_enum NOT NULL,
    payment_status public.booking_payment_status_enum DEFAULT 'unpaid'::public.booking_payment_status_enum NOT NULL,
    subtotal integer NOT NULL,
    discount integer DEFAULT 0 NOT NULL,
    service_total integer DEFAULT 0 NOT NULL,
    total_price integer NOT NULL,
    hotel_payout integer DEFAULT 0 NOT NULL,
    cancel_reason text,
    cancelled_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    room_number character varying(50),
    room_legs jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT chk_booking_date CHECK ((checkout_date >= checkin_date)),
    CONSTRAINT chk_booking_total CHECK ((total_price >= 0))
);

CREATE TABLE public.booking_room (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    room_id uuid NOT NULL,
    room_name character varying(255) NOT NULL,
    book_date date NOT NULL,
    quantity integer NOT NULL,
    price integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_booking_room_quantity CHECK ((quantity > 0))
);

CREATE TABLE public.chatbot_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    message text NOT NULL,
    extracted_filter jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    hotel_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.hotel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(500) NOT NULL,
    city character varying(100) NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    description text,
    star_rating integer DEFAULT 0 NOT NULL,
    email character varying(255),
    phone character varying(20),
    status public.hotel_status_enum DEFAULT 'pending'::public.hotel_status_enum NOT NULL,
    rejection_reason text,
    average_rating numeric(4,2) DEFAULT 0.00 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    checkin_time time without time zone DEFAULT '14:00:00'::time without time zone,
    checkout_time time without time zone DEFAULT '12:00:00'::time without time zone,
    cancellation_deadline_hours integer DEFAULT 24,
    bank_name character varying(100),
    bank_account character varying(50),
    bank_account_holder character varying(255),
    tax_code character varying(50),
    business_license_url text,
    commission_rate numeric(5,2) DEFAULT 18.00,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    property_type character varying(50) DEFAULT 'hotel'::character varying,
    hourly_grace_minutes integer DEFAULT 30 NOT NULL,
    daily_grace_hours integer DEFAULT 6 NOT NULL,
    overnight_checkin_time time without time zone DEFAULT '22:00:00'::time without time zone,
    overnight_checkout_time time without time zone DEFAULT '11:00:00'::time without time zone,
    CONSTRAINT chk_star_rating CHECK (((star_rating >= 0) AND (star_rating <= 5)))
);

CREATE TABLE public.hotel_amenity (
    hotel_id uuid NOT NULL,
    amenity_id uuid NOT NULL
);

CREATE TABLE public.hotel_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.image (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    path text NOT NULL,
    public_id character varying(255),
    room_id uuid,
    hotel_id uuid,
    is_thumbnail boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT chk_image_target CHECK ((((room_id IS NOT NULL) AND (hotel_id IS NULL)) OR ((room_id IS NULL) AND (hotel_id IS NOT NULL))))
);

CREATE TABLE public.payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    payment_method character varying(50) NOT NULL,
    expected_amount integer NOT NULL,
    paid_amount integer DEFAULT 0 NOT NULL,
    qr_code text,
    qr_content text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_transaction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    transaction_id character varying(255) NOT NULL,
    gateway character varying(50) NOT NULL,
    amount integer NOT NULL,
    status public.transaction_status_enum NOT NULL,
    raw_response text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.request_logs (
    id integer NOT NULL,
    method character varying(10),
    endpoint character varying(255),
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE public.request_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.request_logs_id_seq OWNED BY public.request_logs.id;

CREATE TABLE public.review (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    hotel_id uuid NOT NULL,
    booking_id uuid,
    point integer NOT NULL,
    description text,
    reply text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_review_point CHECK (((point >= 1) AND (point <= 10)))
);

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL
);

CREATE TABLE public.room (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    capacity integer NOT NULL,
    base_price integer NOT NULL,
    description text,
    type character varying(100),
    bed_type character varying(100),
    room_area integer,
    amount integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    room_view character varying(50) DEFAULT 'city_view'::character varying,
    hourly_price numeric DEFAULT 0,
    overnight_price numeric DEFAULT 0,
    early_checkin_fee numeric DEFAULT 0,
    late_checkout_fee numeric DEFAULT 0,
    code character varying(50),
    hourly_tiers jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT chk_room_amount CHECK ((amount > 0)),
    CONSTRAINT chk_room_capacity CHECK ((capacity > 0)),
    CONSTRAINT chk_room_price CHECK ((base_price >= 0))
);

CREATE TABLE public.room_amenity (
    room_id uuid NOT NULL,
    amenity_id uuid NOT NULL
);

CREATE TABLE public.room_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    inventory_date date NOT NULL,
    available_count integer NOT NULL,
    sold_count integer DEFAULT 0 NOT NULL,
    locked_count integer DEFAULT 0 NOT NULL,
    base_price integer NOT NULL,
    sell_price integer NOT NULL,
    status public.room_inventory_status_enum DEFAULT 'active'::public.room_inventory_status_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT chk_available_count CHECK ((available_count >= 0)),
    CONSTRAINT chk_locked_count CHECK ((locked_count >= 0)),
    CONSTRAINT chk_sold_count CHECK ((sold_count >= 0))
);

CREATE TABLE public.room_unit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hotel_id uuid,
    room_id uuid,
    room_number character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'available'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    area character varying(100) DEFAULT 'Tầng 1'::character varying
);

CREATE TABLE public.temporary_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid,
    session_id character varying(255),
    lock_date date NOT NULL,
    quantity integer NOT NULL,
    lock_expires_at timestamp without time zone NOT NULL,
    booking_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval),
    CONSTRAINT chk_temp_quantity CHECK ((quantity > 0))
);

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    phone character varying(20),
    dob date,
    avatar text,
    email_verified boolean DEFAULT false NOT NULL,
    phone_verified boolean DEFAULT false NOT NULL,
    activate boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.amenity
    ADD CONSTRAINT amenity_name_key UNIQUE (name);

ALTER TABLE ONLY public.amenity
    ADD CONSTRAINT amenity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_booking_code_key UNIQUE (booking_code);

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.booking_room
    ADD CONSTRAINT booking_room_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chatbot_log
    ADD CONSTRAINT chatbot_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, hotel_id);

ALTER TABLE ONLY public.hotel_amenity
    ADD CONSTRAINT hotel_amenity_pkey PRIMARY KEY (hotel_id, amenity_id);

ALTER TABLE ONLY public.hotel
    ADD CONSTRAINT hotel_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hotel_staff
    ADD CONSTRAINT hotel_staff_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_transaction
    ADD CONSTRAINT payment_transaction_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.room_amenity
    ADD CONSTRAINT room_amenity_pkey PRIMARY KEY (room_id, amenity_id);

ALTER TABLE ONLY public.room_inventory
    ADD CONSTRAINT room_inventory_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.room_unit
    ADD CONSTRAINT room_unit_hotel_id_room_number_key UNIQUE (hotel_id, room_number);

ALTER TABLE ONLY public.room_unit
    ADD CONSTRAINT room_unit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.temporary_locks
    ADD CONSTRAINT temporary_locks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review
    ADD CONSTRAINT unique_booking_review UNIQUE (booking_id);

ALTER TABLE ONLY public.hotel_staff
    ADD CONSTRAINT unique_hotel_user UNIQUE (hotel_id, user_id);

ALTER TABLE ONLY public.room_inventory
    ADD CONSTRAINT uq_room_inventory_date UNIQUE (room_id, inventory_date);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT uq_user_hotel UNIQUE (user_id, hotel_id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT uq_user_hotel_favorites UNIQUE (user_id, hotel_id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_booking_hotel_id ON public.booking USING btree (hotel_id);

CREATE INDEX idx_booking_user_id ON public.booking USING btree (user_id);

CREATE INDEX idx_fav_hotel ON public.favorites USING btree (hotel_id);

CREATE INDEX idx_fav_user ON public.favorites USING btree (user_id);

CREATE INDEX idx_favorites_hotel_id ON public.favorites USING btree (hotel_id);

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);

CREATE INDEX idx_hotel_status ON public.hotel USING btree (status);

CREATE INDEX idx_request_logs_created_at ON public.request_logs USING btree (created_at);

CREATE INDEX idx_review_hotel_id ON public.review USING btree (hotel_id);

CREATE INDEX idx_room_hotel_id ON public.room USING btree (hotel_id);

CREATE INDEX idx_temp_locks_expires ON public.temporary_locks USING btree (expires_at);

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.booking_room
    ADD CONSTRAINT booking_room_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.booking_room
    ADD CONSTRAINT booking_room_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.chatbot_log
    ADD CONSTRAINT chatbot_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.hotel_amenity
    ADD CONSTRAINT hotel_amenity_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenity(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.hotel_amenity
    ADD CONSTRAINT hotel_amenity_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.hotel
    ADD CONSTRAINT hotel_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.hotel_staff
    ADD CONSTRAINT hotel_staff_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.hotel_staff
    ADD CONSTRAINT hotel_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.image
    ADD CONSTRAINT image_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_transaction
    ADD CONSTRAINT payment_transaction_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payment(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.room_amenity
    ADD CONSTRAINT room_amenity_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenity(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room_amenity
    ADD CONSTRAINT room_amenity_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room_inventory
    ADD CONSTRAINT room_inventory_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room_unit
    ADD CONSTRAINT room_unit_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotel(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room_unit
    ADD CONSTRAINT room_unit_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.temporary_locks
    ADD CONSTRAINT temporary_locks_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.temporary_locks
    ADD CONSTRAINT temporary_locks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
