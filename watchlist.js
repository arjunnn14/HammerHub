import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('watchlist-container');

  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    container.innerHTML = '<p>You need to be logged in to view your watchlist.</p>';
    return;
  }

  const { data: watchlist, error } = await supabaseClient
    .from('watchlist')
    .select('auction_id, auction:auction_id (id, current_price, end_time, product:product_id (name, image_url))')
    .eq('user_id', userId);

  if (error) {
    console.error('Error loading watchlist:', error);
    container.innerHTML = '<p>Failed to load watchlist.</p>';
    return;
  }

  if (watchlist.length === 0) {
    container.innerHTML = '<p>No items in your watchlist.</p>';
    return;
  }

  container.innerHTML = '';
  watchlist.forEach(item => {
    const a = item.auction;
    const p = a.product;

    const card = document.createElement('div');
    card.className = 'auction-card';
    card.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}" class="auction-thumb" />
      <div class="auction-details">
        <h3>${p.name}</h3>
        <p>Current Bid: ₹${a.current_price}</p>
        <p>Ends: ${new Date(a.end_time).toLocaleString()}</p>
        <a href="auction-details.html?id=${a.id}" class="yellow-btn">View Auction</a>
      </div>
    `;
    container.appendChild(card);
  });
});
