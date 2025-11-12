-- Push Chain Facilitator Indexer Database Schema

-- Main transaction records table
CREATE TABLE IF NOT EXISTS facilitated_tx (
    tx_hash TEXT PRIMARY KEY,
    block_number BIGINT NOT NULL,
    block_hash TEXT NOT NULL,
    block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sender TEXT NOT NULL,
    target TEXT NOT NULL,
    facilitator TEXT NOT NULL,
    token_address TEXT, -- NULL for native transfers
    value NUMERIC NOT NULL,
    gas_used BIGINT,
    gas_price NUMERIC,
    input_data BYTEA,
    decoded JSONB,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, reverted, reorged
    chain_id INTEGER NOT NULL,
    tx_type INTEGER NOT NULL, -- 0 = native, 1 = ERC20, 2 = cross-chain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event log records table
CREATE TABLE IF NOT EXISTS facilitator_event (
    id BIGSERIAL PRIMARY KEY,
    tx_hash TEXT NOT NULL REFERENCES facilitated_tx(tx_hash) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_args JSONB NOT NULL,
    log_index INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Indexer state tracking table
CREATE TABLE IF NOT EXISTS indexer_state (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL UNIQUE,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    last_processed_block_hash TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_block_number ON facilitated_tx(block_number);
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_sender ON facilitated_tx(sender);
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_target ON facilitated_tx(target);
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_token ON facilitated_tx(token_address);
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_status ON facilitated_tx(status);
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_type ON facilitated_tx(tx_type);
CREATE INDEX IF NOT EXISTS idx_facilitated_tx_timestamp ON facilitated_tx(block_timestamp);

CREATE INDEX IF NOT EXISTS idx_facilitator_event_tx_hash ON facilitator_event(tx_hash);
CREATE INDEX IF NOT EXISTS idx_facilitator_event_block_number ON facilitator_event(block_number);
CREATE INDEX IF NOT EXISTS idx_facilitator_event_name ON facilitator_event(event_name);
CREATE INDEX IF NOT EXISTS idx_facilitator_event_sender ON facilitator_event((event_args->>'sender'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_facilitated_tx_updated_at BEFORE UPDATE ON facilitated_tx
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

