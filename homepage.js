import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  fetchFeaturedAuctions();
  setupSearch();
  setupCategoryFilter();
  checkAuthButtons();
  updateAllAuctionStatuses();
});

// 🔥 Fetch Auctions & Remove Expired Ones
async function fetchFeaturedAuctions(matchingProductIds = null) {
  const auctionList = document.getElementById('auction-list');
  const heading = document.getElementById('greeting-text');
  auctionList.innerHTML = 'Loading auctions...';

  // If explicitly empty list passed, exit early
  if (matchingProductIds && matchingProductIds.length === 0) {
    heading.innerText = 'No Live Auctions';
    auctionList.innerHTML = 'No auctions found.';
    return;
  }

  let query = supabaseClient
    .from('auction')
    .select('id, current_price, end_time, product:product!auction_product_id_fkey(name, image_url, id, category_id)')
    .order('end_time', { ascending: true });

  if (matchingProductIds) {
    query = query.in('product_id', matchingProductIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Fetch error:', error);
    auctionList.innerHTML = 'Failed to load auctions.';
    heading.innerText = 'Auction Error';
    return;
  }

  const now = new Date();
  const validAuctions = data.filter(auction => new Date(auction.end_time) > now);

  if (validAuctions.length === 0) {
    heading.innerText = 'No Live Auctions';
    auctionList.innerHTML = 'No auctions found.';
    return;
  }

  heading.innerText = 'Live Auctions';
  auctionList.innerHTML = '';

  validAuctions.forEach(auction => {
    const div = document.createElement('div');
    div.className = 'auction-card';

    div.innerHTML = `
      <img src="${auction.product?.image_url || 'placeholder.jpg'}" alt="${auction.product?.name || 'No Name'}" class="auction-thumb" />
      <h3>${auction.product?.name || 'Unnamed Product'}</h3>
      <p>Current Bid: ₹${auction.current_price}</p>
      <button class="yellow-btn" onclick="location.href='auction-details.html?id=${auction.id}'">View Auction</button>
    `;

    auctionList.appendChild(div);
  });
}


// 🔍 Search Functionality
function setupSearch() {
  const searchInput = document.querySelector('.search-container input');
  searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim().toLowerCase();

    if (query === '') {
      fetchFeaturedAuctions(); // Show all
      return;
    }

    const { data: products, error } = await supabaseClient
      .from('product')
      .select('id, name')
      .ilike('name', `%${query}%`);

    if (error) {
      console.error('❌ Product search error:', error);
      return;
    }

    const matchingIds = products.map(p => p.id);
    fetchFeaturedAuctions(matchingIds);
  });
}

// 📂 Category Filter
function setupCategoryFilter() {
  const categoryLinks = document.querySelectorAll('#category-list a');

  categoryLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();

      categoryLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const selectedCategory = link.dataset.category;

      const { data: category, error: categoryError } = await supabaseClient
        .from('category')
        .select('id')
        .eq('name', selectedCategory)
        .single();

      if (categoryError || !category) {
        console.error('❌ Category fetch error:', categoryError);
        return;
      }

      const { data: products, error: productError } = await supabaseClient
        .from('product')
        .select('id')
        .eq('category_id', category.id);

      if (productError) {
        console.error('❌ Product fetch error:', productError);
        return;
      }

      const productIds = products.map(p => p.id);
      fetchFeaturedAuctions(productIds);
    });
  });
}

// 👤 Auth Buttons Handling
async function checkAuthButtons() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const authButtons = document.querySelector('.auth-buttons');

  if (session && session.user) {
    authButtons.innerHTML = `
      <button class="auth-btn" id="create-auction-btn">➕ Create Auction</button>
      <button class="auth-btn" onclick="window.location.href='watchlist.html'">⭐ Watchlist</button>
      <button class="auth-btn" id="profile-btn">👤 Profile</button>
      <button class="auth-btn primary" id="logout-btn">Logout</button>
    `;

    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('profile-btn').addEventListener('click', () => {
      window.location.href = 'profile.html';
    });
    document.getElementById('create-auction-btn').addEventListener('click', () => {
      window.location.href = 'create-auction.html';
    });
  }
}

// 🚪 Logout
async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error('Logout failed:', error.message);
  } else {
    window.location.reload();
  }
}

export async function updateAllAuctionStatuses() {
  try {
    console.log('🚀 Running updateAllAuctionStatuses...');
    const now = new Date().toISOString();

    const { data: auction, error } = await supabaseClient
      .from('auction')
      .select('id, end_time, status')
      .lt('end_time', now)
      .neq('status', 'completed');

    if (error) {
      console.error('❌ Fetch error:', error);
      return;
    }

    console.log('⏳ Auctions to update:', auction);

    for (const auctions of auction) {
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
setInterval(() => {
  updateAllAuctionStatuses();
}, 10000); // every 10 seconds

async function callEdgeFunction() {
  const response = await fetch('https://jzcmbrqogyghyhvwzgps.supabase.co/functions/v1/sync-ended-auctions', {
    method: 'POST',  // or 'GET' depending on the function
    headers: {
      'Content-Type': 'application/json',
      // Add any authentication headers if needed
      'Authorization': `Bearer ${your_jwt_token}` // If using JWT for authorization
    },
    body: JSON.stringify({
      // Send any data the function expects (optional)
      key: 'value',
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('Edge function response:', data);
  } else {
    console.error('Error calling edge function:', data);
  }
}
// Call the function
callEdgeFunction();

document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
});
