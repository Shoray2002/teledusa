import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://waoagyzuyysnnesnvluh.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhb2FneXp1eXlzbm5lc252bHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjU3NzYwMjMsImV4cCI6MTk4MTM1MjAyM30._B71oydopgQvLoBgwcRFStJjnMsVZdqp1hCXGnY8eXU";
const supabase = createClient(supabaseUrl, supabaseKey);

// const { data, error } = await supabase.from("users").select("*");

// add new row
const { data, error } = await supabase.from("users").insert(
  [{ user_id: "Tim", cookie: "23" }],
  { returning: "minimal" } // Don't return the value after inserting
);
