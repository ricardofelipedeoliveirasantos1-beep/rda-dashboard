-- Migration 05: Add shirt_number to match_players table
ALTER TABLE match_players 
ADD COLUMN IF NOT EXISTS shirt_number smallint;
