import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ Signup script loaded");

  const form = document.getElementById('signup-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const googleSignupBtn = document.getElementById('google-signup');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

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

  googleSignupBtn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google'
    });

    if (error) {
      alert(`❌ Google sign-up failed: ${error.message}`);
    }
  });
});
