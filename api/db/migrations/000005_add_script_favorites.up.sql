ALTER TABLE saved_scripts
    ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN favorite_sort INT;

CREATE INDEX idx_saved_scripts_user_favorites ON saved_scripts (user_id, favorite_sort)
    WHERE deleted_at IS NULL AND is_favorite = TRUE;
