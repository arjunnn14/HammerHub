import { supabaseClient } from './supabase.js';

const urlParams = new URLSearchParams(window.location.search);
const auctionId = urlParams.get('id');

const productNameEl = document.getElementById('product-name');
const imageEl = document.getElementById('auction-image');
const descriptionEl = document.getElementById('auction-description');
const categoryEl = document.getElementById('auction-category');
const startingPriceEl = document.getElementById('starting-price');
const currentPriceEl = document.getElementById('current-price');
const endTimeEl = document.getElementById('end-time');
const bidForm = document.getElementById('place-bid-form');
const bidAmountInput = document.getElementById('bid-amount');
const statusMessage = document.getElementById('status-message');

let endTime;
let currentPrice = 0;
let sellerId;

document.addEventListener('DOMContentLoaded', async () => {
  if (!auctionId) {
    statusMessage.textContent = '❌ Invalid auction ID';
    return;
  }

  await loadAuctionDetails();
  startCountdown();
  startPricePolling();
});

async function loadAuctionDetails() {
  const { data, error } = await supabaseClient
    .from('auction')
    .select(`
      id,
      starting_price,
      current_price,
      end_time,
      seller_id,
      product:product!auction_product_id_fkey (
        name,
        image_url,
        description,
        category:category_id (name)
      )
    `)
    .eq('id', auctionId)
    .single();

  if (error || !data) {
    console.error('Error fetching auction:', error);
    statusMessage.textContent = '❌ Failed to load auction';
    return;
  }

  const { product } = data;

  productNameEl.textContent = product.name;
  imageEl.src = product.image_url;
  descriptionEl.textContent = product.description;
  categoryEl.textContent = product.category?.name || 'N/A';
  startingPriceEl.textContent = data.starting_price;
  currentPrice = data.current_price;
  currentPriceEl.textContent = currentPrice;

  endTime = new Date(data.end_time);
  sellerId = data.seller_id;
}

let currentUserId;
let currentAuctionId;

const { data: userData, error: userError } = await supabaseClient.auth.getUser();
currentUserId = userData?.user?.id;
currentAuctionId = new URLSearchParams(window.location.search).get('id');

if (currentUserId && currentAuctionId) {
  checkIfInWatchlist(currentUserId, currentAuctionId);
}

document.getElementById('watchlist-btn').addEventListener('click', async () => {
  const inList = await isInWatchlist(currentUserId, currentAuctionId);
  if (inList) {
    await removeFromWatchlist(currentUserId, currentAuctionId);
  } else {
    await addToWatchlist(currentUserId, currentAuctionId);
  }
  checkIfInWatchlist(currentUserId, currentAuctionId);
});

async function isInWatchlist(userId, auctionId) {
  const { data } = await supabaseClient
    .from('watchlist')
    .select('id')
    .eq('user_id', userId)
    .eq('auction_id', auctionId)
    .maybeSingle();
  return !!data;
}

async function addToWatchlist(userId, auctionId) {
  await supabaseClient.from('watchlist').insert([{ user_id: userId, auction_id: auctionId }]);
}

async function removeFromWatchlist(userId, auctionId) {
  await supabaseClient
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('auction_id', auctionId);
}

async function checkIfInWatchlist(userId, auctionId) {
  const btn = document.getElementById('watchlist-btn');
  const inList = await isInWatchlist(userId, auctionId);
  btn.textContent = inList ? '✅ In Watchlist' : '⭐ Add to Watchlist';
}

function startCountdown() {
  function updateCountdown() {
    const now = new Date();
    const diff = endTime - now;

    if (diff <= 0) {
      endTimeEl.textContent = 'Auction Ended';
      clearInterval(timerInterval);
      bidForm.style.display = 'none';
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    endTimeEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }

  updateCountdown();
  var timerInterval = setInterval(updateCountdown, 1000);
}

function startPricePolling() {
  setInterval(async () => {
    const { data, error } = await supabaseClient
      .from('auction')
      .select('current_price')
      .eq('id', auctionId)
      .single();

    if (!error && data?.current_price !== currentPrice) {
      currentPrice = data.current_price;
      currentPriceEl.textContent = currentPrice;
    }
  }, 3000);
}

bidForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusMessage.textContent = '';

  const bidAmount = parseFloat(bidAmountInput.value);

  if (isNaN(bidAmount) || bidAmount <= currentPrice) {
    statusMessage.textContent = '❌ Your bid must be higher than the current price.';
    return;
  }

  const { data: userData, error: authError } = await supabaseClient.auth.getUser();
  const userId = userData?.user?.id;

  if (authError || !userId) {
    statusMessage.textContent = '❌ You must be logged in to place a bid.';
    return;
  }

  if (userId === sellerId) {
    statusMessage.textContent = '⚠️ You cannot bid on your own auction.';
    return;
  }

  // 💰 Check wallet balance
  const { data: walletData, error: walletError } = await supabaseClient
    .from('wallet')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (walletError || !walletData) {
    statusMessage.textContent = '❌ Could not fetch wallet balance.';
    return;
  }

  const walletBalance = parseFloat(walletData.balance);
  if (walletBalance < bidAmount) {
    statusMessage.textContent = '❌ Insufficient wallet balance to place this bid.';
    return;
  }

  // 🔍 Check for previous highest bidder
  const { data: previousBids } = await supabaseClient
    .from('bid')
    .select('bidder_id, bid_amount')
    .eq('auction_id', auctionId)
    .order('bid_amount', { ascending: false })
    .limit(2);

  const { error: insertError } = await supabaseClient.from('bid').insert([
    {
      auction_id: auctionId,
      bidder_id: userId,
      bid_amount: bidAmount,
    },
  ]);

  if (insertError) {
    console.error('Bid error:', insertError);
    statusMessage.textContent = '❌ Failed to place bid.';
    return;
  }

  const { error: updateError } = await supabaseClient
    .from('auction')
    .update({ current_price: bidAmount })
    .eq('id', auctionId);

  if (updateError) {
    console.error('Price update error:', updateError);
    statusMessage.textContent = '⚠️ Bid was recorded but price update failed.';
    return;
  }

  const { data: auctionInfo } = await supabaseClient
    .from('auction')
    .select('product(name), seller_id')
    .eq('id', auctionId)
    .single();

  const productName = auctionInfo.product?.name || 'your item';
  const sellerUserId = auctionInfo.seller_id;

  // ✅ Notify the seller
  await supabaseClient.from('notifications').insert([
    {
      user_id: sellerUserId,
      auction_id: auctionId,
      message: `📢 Someone just placed a bid on your product: "${productName}"!`,
      read: false,
    },
  ]);

  // ✅ Notify previous highest bidder (outbid)
  if (previousBids && previousBids.length > 1) {
    const previousHighestBid = previousBids[1];
    const previousBidderId = previousHighestBid.bidder_id;

    if (previousBidderId !== userId) {
      await supabaseClient.from('notifications').insert([
        {
          user_id: previousBidderId,
          auction_id: auctionId,
          message: `🔔 You've been outbid on "${productName}".`,
          read: false,
        },
      ]);
    }
  }

  statusMessage.textContent = '✅ Bid placed successfully!';
  bidAmountInput.value = '';
});

// 🛎 Notifications dropdown setup (unchanged)
document.addEventListener('DOMContentLoaded', () => {
  const bell = document.getElementById('notification-bell');
  const list = document.getElementById('notification-list');
  const badge = document.getElementById('notification-badge');

  if (!bell || !list || !badge) return;

  bell.addEventListener('click', async (e) => {
    e.stopPropagation();
    list.classList.toggle('hidden');

    if (!list.classList.contains('hidden')) {
      await loadNotifications(true);
      badge.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target) && !list.contains(e.target)) {
      list.classList.add('hidden');
    }
  });

  async function loadNotifications(markAsRead = false) {
    list.innerHTML = '<li>Loading...</li>';

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      list.innerHTML = '<li>❌ Not logged in</li>';
      return;
    }

    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) {
      list.innerHTML = '<li>Error loading notifications</li>';
      return;
    }

    if (data.length === 0) {
      list.innerHTML = '<li>No notifications</li>';
      return;
    }

    list.innerHTML = '';
    let unreadCount = 0;

    data.forEach(n => {
      const li = document.createElement('li');
      li.textContent = n.message;
      list.appendChild(li);
      if (!n.read) unreadCount++;
    });

    if (unreadCount > 0 && list.classList.contains('hidden')) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
    }

    if (markAsRead && unreadCount > 0) {
      const unreadIds = data.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabaseClient
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);
      }
    }
  }

  loadNotifications();
  setInterval(() => loadNotifications(), 15000);

  async function markCompletedAuctions() {
    const { data, error } = await supabaseClient.rpc('mark_auctions_completed');
    if (error) {
      console.error('Error updating completed auctions:', error.message);
    } else {
      console.log('✅ Completed auctions marked successfully');
    }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    await markCompletedAuctions(); // Mark ended auctions as completed
    await loadAuctionDetails();    // Then load auction data
    startCountdown();
    startPricePolling();
  const { data, error } = await supabase
  .from('bid')
  .insert([{ auction_id, bidder_id, bid_amount }]);
  });
});
