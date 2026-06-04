DROP INDEX IF EXISTS idx_saved_scripts_user_favorites;

ALTER TABLE saved_scripts
    DROP COLUMN IF EXISTS favorite_sort,
    DROP COLUMN IF EXISTS is_favorite;
