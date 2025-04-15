import { supabaseClient } from './supabase.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(`❌ Login failed: ${error.message}`);
  } else {
    window.location.href = 'homepage.html';
  }

   const btn = document.getElementById("triggerBtn");
    const statusText = document.getElementById("statusText");

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      statusText.textContent = "Processing...";

      try {
        const response = await fetch("https://<your-project-ref>.functions.supabase.co/process_ended_auctions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer YOUR_ANON_KEY_HERE", // or service role key if protected
          },
        });

        const text = await response.text();

        if (response.ok) {
          statusText.textContent = "✅ Success: " + text;
        } else {
          statusText.textContent = "❌ Failed: " + text;
        }
      } catch (error) {
        statusText.textContent = "❌ Error calling function.";
        console.error(error);
      }

      btn.disabled = false;
    });
});

// Google login
document.getElementById('google-login').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(`❌ Google sign-in failed: ${error.message}`);
});

 const btn = document.getElementById("triggerBtn");
    const statusText = document.getElementById("statusText");

    });
