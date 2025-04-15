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

const { data, error } = await supabase.auth.signUp({
  email: emailInput.value,
  password: passwordInput.value,
});

if (!error && data?.user) {
  const userId = data.user.id;

  // Insert into your own "user" table
  await supabase.from('user').insert([{ id: userId, email: data.user.email }]);

  // Insert wallet with ₹100000
  await supabase.from('wallet').insert([{ user_id: userId, balance: 100000 }]);
}
