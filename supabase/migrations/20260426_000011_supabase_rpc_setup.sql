-- SUPABASE RPC SETUP FOR DEALBANK
-- Run these in your Supabase SQL Editor

-- Clean up existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS consume_data_credits(UUID, INT);
DROP FUNCTION IF EXISTS increment_marketplace_listing_view(UUID);
DROP FUNCTION IF EXISTS refresh_marketplace_listing_matches(UUID);
DROP FUNCTION IF EXISTS submit_realtor_commission_review(UUID, INT, TEXT);

-- 1. Consume Data Credits
-- Used when a user performs an action that costs credits (e.g., skips tracing, property intelligence)
CREATE OR REPLACE FUNCTION consume_data_credits(p_user_id UUID, p_amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credits INT;
BEGIN
    -- Get current credits from users table (adjust if you use user_profiles)
    SELECT COALESCE(credits_remaining, 0) INTO current_credits
    FROM users
    WHERE id = p_user_id;

    IF current_credits < p_amount THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Insufficient credits');
    END IF;

    -- Update credits
    UPDATE users
    SET credits_remaining = credits_remaining - p_amount
    WHERE id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'remaining', current_credits - p_amount);
END;
$$;

-- 2. Increment Marketplace Listing View
CREATE OR REPLACE FUNCTION increment_marketplace_listing_view(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE marketplace_listings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_listing_id;
END;
$$;

-- 3. Refresh Marketplace Listing Matches
CREATE OR REPLACE FUNCTION refresh_marketplace_listing_matches(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Logic for matching buyers/sellers would go here
    RETURN jsonb_build_object('ok', true, 'message', 'Matches refreshed');
END;
$$;

-- 4. Submit Realtor Commission Review
CREATE OR REPLACE FUNCTION submit_realtor_commission_review(p_contract_id UUID, p_rating INT, p_comment TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Assuming a realtor_reviews table exists
    INSERT INTO realtor_reviews (contract_id, rating, comment, created_at)
    VALUES (p_contract_id, p_rating, p_comment, NOW())
    ON CONFLICT (contract_id) 
    DO UPDATE SET 
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        updated_at = NOW();

    RETURN jsonb_build_object('ok', true);
END;
$$;
