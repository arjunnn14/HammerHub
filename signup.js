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

async function updateAllAuctionStatuses() {
  try {
    console.log('🚀 Running updateAllAuctionStatuses...');
    const now = new Date().toISOString();

    const { data: auctions, error } = await supabaseClient
      .from('auction')
      .select('id, end_time, status')
      .lt('end_time', now)
      .neq('status', 'completed');

    if (error) {
      console.error('❌ Fetch error:', error);
      return;
    }

    console.log('⏳ Auctions to update:', auctions);

    for (const auction of auctions) {
      const { data: topBid, error: bidError } = await supabaseClient
        .from('bid')
        .select('bidder_id')
        .eq('auction_id', auction.id)
        .order('bid_amount', { ascending: false })
        .limit(1)
        .maybeSingle(); // handles no-bid case safely

      console.log(`🏷️ Auction ${auction.id} Top Bid:`, topBid);

      if (bidError) {
        console.error(`❌ Bid fetch error for auction ${auction.id}:`, bidError);
        continue;
      }

      const updatePayload = topBid
        ? { status: 'completed', winner_id: topBid.bidder_id }
        : { status: 'completed' };

      const { data: updateData, error: updateError } = await supabaseClient
        .from('auction')
        .update(updatePayload)
        .eq('id', auction.id)
        .select(); // to verify update happened

      if (updateError) {
        console.error(`❌ Update error for auction ${auction.id}:`, updateError);
      } else {
        console.log(`✅ Auction ${auction.id} updated:`, updateData);
      }
    }

    console.log('🎯 All auctions processed.');
  } catch (err) {
    console.error('💥 Fatal error:', err);
  }
}
updateAllAuctionStatuses();


// Google signup
document.getElementById('google-signup').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(`❌ Google sign-up failed: ${error.message}`);
});
