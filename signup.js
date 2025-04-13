import { supabaseClient } from './supabase.js';

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(`❌ Signup failed: ${error.message}`);
  } else {
    alert('✅ Signup successful! Please check your email to confirm.');
    window.location.href = 'login.html';
  }
});

// Google signup
document.getElementById('google-signup').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(`❌ Google sign-up failed: ${error.message}`);
});
