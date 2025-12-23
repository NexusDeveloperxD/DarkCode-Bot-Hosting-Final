import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqnqpvqccfadumknreaa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbnFwdnFjY2ZhZHVta25yZWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjcxNzYsImV4cCI6MjA4MjAwMzE3Nn0.RBNkbDSAhGK2_Htxfm4XJBxB4R_eMZ2pHLg1PnMDW4Q';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
