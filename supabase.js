const SUPABASE_URL = 'https://gaeftsnshlkkssqbokhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZWZ0c25zaGxra3NzcWJva2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk3MTUsImV4cCI6MjA5NDQ0NTcxNX0.TY2JQsia_MoBnBJaomaWCw51R-ZUfrutGhDzrfkpoTM';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);