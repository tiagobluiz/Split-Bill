CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    preferred_currency CHAR(3) NOT NULL,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
    id UUID PRIMARY KEY,
    owner_account_id UUID NOT NULL REFERENCES accounts(id),
    name VARCHAR(160) NOT NULL,
    base_currency CHAR(3) NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    default_settlement_algorithm VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT chk_events_default_settlement_algorithm
        CHECK (default_settlement_algorithm IN ('MIN_TRANSFER', 'PAIRWISE'))
);

CREATE TABLE event_collaborators (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    role VARCHAR(24) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_collaborators_event_account UNIQUE (event_id, account_id),
    CONSTRAINT chk_event_collaborators_role CHECK (role IN ('OWNER', 'COLLABORATOR'))
);

CREATE TABLE event_people (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    display_name VARCHAR(120) NOT NULL,
    linked_account_id UUID REFERENCES accounts(id),
    created_by_account_id UUID NOT NULL REFERENCES accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_event_people_event_linked_account
    ON event_people (event_id, linked_account_id)
    WHERE linked_account_id IS NOT NULL;

CREATE TABLE event_categories (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id),
    name VARCHAR(120) NOT NULL,
    is_default BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_event_categories_event_name
    ON event_categories (event_id, name)
    WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX uq_event_categories_global_name
    ON event_categories (name)
    WHERE event_id IS NULL;

CREATE TABLE invite_tokens (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    created_by_account_id UUID NOT NULL REFERENCES accounts(id),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entries (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    type VARCHAR(24) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES event_categories(id),
    amount NUMERIC(19, 4) NOT NULL,
    currency CHAR(3) NOT NULL,
    event_amount NUMERIC(19, 4) NOT NULL,
    payer_person_id UUID NOT NULL REFERENCES event_people(id),
    occurred_at_utc TIMESTAMPTZ NOT NULL,
    fx_rate_snapshot NUMERIC(19, 8),
    fx_source VARCHAR(80),
    note TEXT,
    created_by_account_id UUID NOT NULL REFERENCES accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_entries_type CHECK (type IN ('EXPENSE', 'INCOME')),
    CONSTRAINT chk_entries_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_entries_event_amount_positive CHECK (event_amount > 0)
);

CREATE TABLE entry_participants (
    id UUID PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES event_people(id),
    split_mode VARCHAR(24) NOT NULL,
    split_percent NUMERIC(7, 4),
    split_amount NUMERIC(19, 4),
    resolved_event_amount NUMERIC(19, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entry_participants_entry_person UNIQUE (entry_id, person_id),
    CONSTRAINT chk_entry_participants_split_mode CHECK (split_mode IN ('EVEN', 'PERCENT', 'AMOUNT')),
    CONSTRAINT chk_entry_participants_split_mode_values CHECK (
        (split_mode = 'EVEN' AND split_percent IS NULL AND split_amount IS NULL)
        OR (split_mode = 'PERCENT' AND split_percent IS NOT NULL AND split_amount IS NULL)
        OR (split_mode = 'AMOUNT' AND split_percent IS NULL AND split_amount IS NOT NULL)
    )
);

CREATE TABLE entry_receipts (
    id UUID PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_entry_receipts_size_bytes_positive CHECK (size_bytes > 0)
);

CREATE TABLE fx_rates (
    id UUID PRIMARY KEY,
    provider VARCHAR(80) NOT NULL,
    base_currency CHAR(3) NOT NULL,
    quote_currency CHAR(3) NOT NULL,
    rate NUMERIC(19, 8) NOT NULL,
    rate_date DATE NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_fx_rates_provider_pair_date UNIQUE (provider, base_currency, quote_currency, rate_date),
    CONSTRAINT chk_fx_rates_rate_positive CHECK (rate > 0)
);

CREATE TABLE balance_snapshots (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES event_people(id),
    net_amount NUMERIC(19, 4) NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_balance_snapshots_event_person UNIQUE (event_id, person_id)
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    actor_account_id UUID REFERENCES accounts(id),
    event_id UUID REFERENCES events(id),
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(80) NOT NULL,
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_owner ON events(owner_account_id);
CREATE INDEX idx_event_collaborators_event ON event_collaborators(event_id);
CREATE INDEX idx_event_people_event ON event_people(event_id);
CREATE INDEX idx_event_categories_event ON event_categories(event_id);
CREATE INDEX idx_invite_tokens_event ON invite_tokens(event_id);
CREATE INDEX idx_entries_event ON entries(event_id);
CREATE INDEX idx_entries_payer ON entries(payer_person_id);
CREATE INDEX idx_entry_participants_entry ON entry_participants(entry_id);
CREATE INDEX idx_entry_receipts_entry ON entry_receipts(entry_id);
CREATE INDEX idx_fx_rates_pair_date ON fx_rates(base_currency, quote_currency, rate_date);
CREATE INDEX idx_balance_snapshots_event ON balance_snapshots(event_id);
CREATE INDEX idx_audit_log_event_created_at ON audit_log(event_id, created_at);
