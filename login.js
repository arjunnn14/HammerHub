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
});

// Google login
document.getElementById('google-login').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(`❌ Google sign-in failed: ${error.message}`);
});

document.addEventListener('DOMContentLoaded', () => {
  updateAuctionStatus();
});

async function updateAuctionStatus() {
  // Get current time
  const now = new Date().toISOString();  // ISO format string

  try {
    // Step 1: Fetch auctions where the end_time has passed and the status is not 'completed'
    const { data: auctions, error } = await supabaseClient
      .from('auction')
      .select('id, end_time, status')
      .lt('end_time', now) // Check if the auction end_time is less than the current time
      .neq('status', 'completed'); // Only get auctions that aren't already completed

    if (error) {
      console.error('Error fetching auctions:', error);
      return;
    }

    // Step 2: Loop through auctions and update their status
    for (const auction of auctions) {
      // Step 2a: Get the top bid for this auction
      const { data: topBid, error: bidError } = await supabaseClient
        .from('bid')
        .select('bidder_id')
        .eq('auction_id', auction.id)
        .order('bid_amount', { ascending: false }) // Highest bid first
        .limit(1)
        .single();

      if (bidError) {
        console.error('Error fetching bid:', bidError);
        continue; // Skip this auction if there's an error fetching the bid
      }

      // Step 2b: If a top bid exists, update the auction with the winner
      if (topBid) {
        const { error: updateError } = await supabaseClient
          .from('auction')
          .update({
            status: 'completed',
            winner_id: topBid.bidder_id, // Set winner
          })
          .eq('id', auction.id); // Update the auction based on its ID

        if (updateError) {
          console.error('Error updating auction status:', updateError);
        } else {
          console.log(`Auction ${auction.id} marked as completed with winner ${topBid.bidder_id}`);
        }
      } else {
        // If there was no top bid, just mark the auction as completed without a winner
        const { error: updateError } = await supabaseClient
          .from('auction')
          .update({
            status: 'completed',
          })
          .eq('id', auction.id);

        if (updateError) {
          console.error('Error updating auction status:', updateError);
        } else {
          console.log(`Auction ${auction.id} marked as completed (no bids)`);
        }
      }
    }

    console.log('Auction status update process complete.');
  } catch (error) {
    console.error('Error in updateAuctionStatus:', error);
  }
}

updateAuctionStatus();
