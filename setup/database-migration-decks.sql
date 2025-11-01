-- Migration to convert from commanders to decks system
-- This allows multiple commanders per deck (partner mechanic, backgrounds, etc.)

-- Create decks table
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deck_commanders table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS deck_commanders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    scryfall_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name);
CREATE INDEX IF NOT EXISTS idx_deck_commanders_deck ON deck_commanders(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_commanders_name ON deck_commanders(name);

-- Add update trigger to decks table
CREATE TRIGGER update_decks_updated_at 
    BEFORE UPDATE ON decks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing commanders to decks (each commander becomes a single-commander deck)
INSERT INTO decks (user_id, name, created_at, updated_at)
SELECT user_id, name || ' Deck', created_at, updated_at
FROM commanders;

-- Migrate commanders to deck_commanders
INSERT INTO deck_commanders (deck_id, name, image_url, scryfall_id, created_at)
SELECT d.id, c.name, c.image_url, c.scryfall_id, c.created_at
FROM commanders c
JOIN decks d ON d.user_id = c.user_id AND d.name = c.name || ' Deck';

-- Drop old commanders table (uncomment when ready)
-- DROP TABLE commanders CASCADE;