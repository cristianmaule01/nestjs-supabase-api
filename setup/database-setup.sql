-- User Management Tables for Commander Project
-- Run this in your Supabase SQL Editor

-- Drop existing objects if they exist
DROP TABLE IF EXISTS deck_tags CASCADE;
DROP TABLE IF EXISTS available_tags CASCADE;
DROP TABLE IF EXISTS deck_commanders CASCADE;
DROP TABLE IF EXISTS decks CASCADE;
DROP TABLE IF EXISTS group_invites CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Users table for storing user accounts
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    theme_preference VARCHAR(10) DEFAULT 'dark',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table for MTG Commander groups
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group memberships table for tracking user-group relationships
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) DEFAULT 'player' CHECK (role IN ('admin', 'gm', 'player')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Group invites table for tracking sent invitations
CREATE TABLE IF NOT EXISTS group_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, invitee_id)
);



-- Decks table for user's MTG decks
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deck commanders table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS deck_commanders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    scryfall_id VARCHAR(255),
    color_identity VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Available tags table
CREATE TABLE IF NOT EXISTS available_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deck tags table for categorizing decks
CREATE TABLE IF NOT EXISTS deck_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES available_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deck_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_group ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON group_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee ON group_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON group_invites(status);

CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name);
CREATE INDEX IF NOT EXISTS idx_deck_commanders_deck ON deck_commanders(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_commanders_name ON deck_commanders(name);
CREATE INDEX IF NOT EXISTS idx_available_tags_name ON available_tags(name);
CREATE INDEX IF NOT EXISTS idx_deck_tags_deck ON deck_tags(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_tags_tag ON deck_tags(tag_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply update trigger to groups table
CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON groups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();



-- Apply update trigger to decks table
CREATE TRIGGER update_decks_updated_at 
    BEFORE UPDATE ON decks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (password: 'password')
INSERT INTO users (email, password_hash, first_name, last_name, theme_preference) 
VALUES ('crismaule99@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cris', 'Maule', 'dark');

-- Insert available tags
INSERT INTO available_tags (name) VALUES
('Tokens'), ('Artifacts'), ('+1/+1 Counters'), ('Lifegain'), ('Lands'), ('Go Wide'), ('Reanimator'), ('Enchantments'), ('Sacrifice'), ('Spellslinger'),
('Voltron'), ('Mill'), ('Ramp'), ('Control'), ('Burn'), ('Aggro'), ('Hatebears'), ('Stompy'), ('Pillow Fort'), ('Extra Turns'), ('Extra Combat'),
('Group Hug'), ('Group Slug'), ('Superfriends'), ('Self-Mill'), ('Card Draw'), ('Hand Size'), ('Treasure'), ('Clues'), ('Equipment'), ('Auras'),
('Vehicles'), ('Battles'), ('Sagas'), ('Cascade'), ('Energy'), ('Cipher'), ('Dredge'), ('Delve'), ('Discover'), ('Cycling'), ('Monarch'), ('Undying'),
('Persist'), ('Infect'), ('Discard'), ('Madness'), ('Ninjas'), ('Mutate'), ('Kicker'), ('Proliferate'), ('Scry'), ('Surveil'), ('Flashback'),
('Buyback'), ('Convoke'), ('Devotion'), ('Land Destruction'), ('Stax'), ('Chaos'), ('Companion'), ('Commander Matters'), ('Unblockable'),
('Copy'), ('Theft'), ('Prowess'), ('Adventures'), ('Eldrazi'), ('Zombies'), ('Elves'), ('Goblins'), ('Slivers'), ('Vampires'), ('Dragons'),
('Angels'), ('Spirits'), ('Cats'), ('Dogs'), ('Dinosaurs'), ('Merfolk'), ('Wizards'), ('Warriors'), ('Knights'), ('Soldiers'), ('Pirates'),
('Rogues'), ('Berserkers'), ('Clerics'), ('Spiders'), ('Shamans'), ('Birds'), ('Rats'), ('Horrors'), ('Elementals'), ('Treefolk'), ('Oozes'),
('Snakes'), ('Hydras'), ('Illusions'), ('Bears'), ('Squirrels'), ('Phyrexians'), ('Walls'), ('Giants'), ('Humans'), ('Artifact Creatures'),
('Constructs'), ('Drakes'), ('Faeries'), ('Satyrs'), ('Minotaurs'), ('Gorgons'), ('Harpies'), ('Sphinxes'), ('Archons'), ('Demons'), ('Thrulls'),
('Allies'), ('Specters'), ('Wurms'), ('Praetors'), ('Trolls'), ('Krakens'), ('Leviathans'), ('Serpents'), ('Pegasi'), ('Werewolves'), ('Plants'),
('Fungus'), ('Saprolings'), ('Kor'), ('Aetherborn'), ('Viashino'), ('Vedalken'), ('Myrs'), ('Artificers'), ('Modals'), ('Mutants'), ('Scouts'),
('Beasts'), ('Centaurs'), ('Druids'), ('Oreskos'), ('Soltari'), ('Kithkin'), ('Loxodon'), ('Golems'), ('Mecha')
ON CONFLICT (name) DO NOTHING;