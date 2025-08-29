-- Function to delete user account completely
-- This function has the necessary permissions to delete from auth.users
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with elevated privileges
AS $$
DECLARE
    current_user_id UUID;
    leaderboard_count INTEGER := 0;
    profile_count INTEGER := 0;
    auth_user_count INTEGER := 0;
    result json;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete account';
    END IF;
    
    -- Start transaction (implicit in function)
    BEGIN
        -- Delete user data from custom tables first (in correct order)
        -- Delete leaderboard entries
        DELETE FROM public.leaderboard WHERE user_id = current_user_id;
        GET DIAGNOSTICS leaderboard_count = ROW_COUNT;
        
        -- Delete profile (this might cascade due to foreign key constraints)
        DELETE FROM public.profiles WHERE id = current_user_id;
        GET DIAGNOSTICS profile_count = ROW_COUNT;
        
        -- Finally, delete the auth user
        -- This requires SECURITY DEFINER to have permission to delete from auth.users
        DELETE FROM auth.users WHERE id = current_user_id;
        GET DIAGNOSTICS auth_user_count = ROW_COUNT;
        
        -- Return success with deletion counts
        result := json_build_object(
            'success', true,
            'user_id', current_user_id,
            'deleted_counts', json_build_object(
                'leaderboard_entries', leaderboard_count,
                'profile', profile_count,
                'auth_user', auth_user_count
            )
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- If any error occurs, the transaction will be rolled back automatically
        RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
    END;
    
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Revoke execute permission from anonymous users for security
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;
