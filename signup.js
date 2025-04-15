import { supabaseClient } from './supabase.js';

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const email = emailInput.value;
  const password = passwordInput.value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert(`❌ Signup failed: ${error.message}`);
  } else {
    const userId = data.user.id;

    // Insert into "user" table
    const { error: userInsertError } = await supabaseClient.from('user').insert([
      { id: userId, email: data.user.email },
    ]);

    if (userInsertError) {
      console.error('❌ Failed to insert into user table:', userInsertError);
    }

    // Insert wallet with ₹100000
    const { error: walletInsertError } = await supabaseClient.from('wallet').insert([
      { user_id: userId, balance: 100000 },
    ]);

    if (walletInsertError) {
      console.error('❌ Failed to insert wallet:', walletInsertError);
    }

    alert('✅ Signup successful! Please check your email to confirm.');
    window.location.href = 'login.html';
  }
});

// Google signup
document.getElementById('google-signup').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(`❌ Google sign-up failed: ${error.message}`);
});
