const SUPABASE_URL = "https://wzllqrkyjhvxwuaozpbe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bGxxcmt5amh2eHd1YW96cGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTk2OTEsImV4cCI6MjA5OTA5NTY5MX0.ce-YDBbxIhn6wzOKzMhsAN7SSvZYhJ7NMze91VCwgB8";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
