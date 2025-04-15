import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  fetchFeaturedAuctions();
  setupSearch();
  setupCategoryFilter();
  checkAuthButtons();
  updateAuctionStatus();
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

// Run the function to check auctions and update status
updateAuctionStatus();
setInterval(() => {
  updateAuctionStatus();
}, 10000); // every 10 seconds

document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
});
