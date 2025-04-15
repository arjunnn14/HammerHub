// supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://jzcmbrqogyghyhvwzgps.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y21icnFvZ3lnaHlodnd6Z3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMjA0MzUsImV4cCI6MjA1OTc5NjQzNX0.2Cc_QdoHU_Q72XFKmhRD0bvOnx4t2UswWy5lK_w8aj4";
export const supabaseClient = createClient(supabaseUrl, supabaseKey);
