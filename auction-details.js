import { supabaseClient } from './supabase.js';
import './notification.js'; // Make sure this is only imported ONCE per page

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
const endTimeInputEl = document.getElementById('auction-end-time');
const watchlistBtn = document.getElementById('watchlist-btn');
const auctionIdEl = document.getElementById('auction-id');
const shareButton = document.getElementById('share-auction-btn');

let endTime;
let currentPrice = 0;
let sellerId;

let currentUserId;
let currentAuctionId;

document.addEventListener('DOMContentLoaded', async () => {
  if (!auctionId) {
    statusMessage.textContent = '❌ Invalid auction ID';
    return;
  }

  await loadAuctionDetails();
  startCountdown();
  startPricePolling();

  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id;
  currentAuctionId = auctionId;

  if (currentUserId && currentAuctionId) {
    checkIfInWatchlist(currentUserId, currentAuctionId);
  }

  // Watchlist button
  document.getElementById('watchlist-btn').addEventListener('click', async () => {
    const inList = await isInWatchlist(currentUserId, currentAuctionId);
    if (inList) {
      await removeFromWatchlist(currentUserId, currentAuctionId);
    } else {
      await addToWatchlist(currentUserId, currentAuctionId);
    }
    checkIfInWatchlist(currentUserId, currentAuctionId);
  });

  // Share button
  const shareButton = document.getElementById('share-auction-btn');
  if (shareButton) {
    shareButton.addEventListener('click', async () => {
      const shareUrl = `${window.location.origin}/auction-details.html?id=${auctionId}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Check out this auction on HammerHub!',
            text: 'Place your bid before it ends! 🔨',
            url: shareUrl,
          });
        } catch (error) {
          console.error('Web Share API failed:', error);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert('🔗 Auction link copied to clipboard!');
        } catch (error) {
          console.error('Clipboard copy failed:', error);
          alert('❌ Failed to copy link. Please try manually.');
        }
      }
    });
  }
});

// Load auction details
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
    console.error('Auction fetch error:', error);
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

// Countdown timer
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

// Price polling every 3 seconds
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

// Bid submission
bidForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusMessage.textContent = '';

  const bidAmount = parseFloat(bidAmountInput.value);

  if (isNaN(bidAmount) || bidAmount <= currentPrice) {
    statusMessage.textContent = '❌ Your bid must be valid and higher than current price.';
    return;
  }

  if (!(await checkAuctionExists(auctionId))) {
    statusMessage.textContent = '❌ Auction not found.';
    return;
  }

  const userId = await checkUserExists();
  if (!userId) {
    statusMessage.textContent = '❌ You must be logged in.';
    return;
  }

  if (userId === sellerId) {
    statusMessage.textContent = '⚠ You cannot bid on your own auction.';
    return;
  }

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

  await supabaseClient
    .from('auction')
    .update({ current_price: bidAmount })
    .eq('id', auctionId);

  const { data: auctionInfo } = await supabaseClient
    .from('auction')
    .select('product(name), seller_id')
    .eq('id', auctionId)
    .single();

  const productName = auctionInfo?.product?.name || 'your item';
  const sellerUserId = auctionInfo?.seller_id;

  statusMessage.textContent = '✅ Bid placed!';
  bidAmountInput.value = '';
});

// Helper: check auction exists
async function checkAuctionExists(auctionId) {
  const { data, error } = await supabaseClient
    .from('auction')
    .select('id')
    .eq('id', auctionId)
    .single();

  return !error && data;
}

// Helper: check user logged in
async function checkUserExists() {
  const { data: userData, error } = await supabaseClient.auth.getUser();
  return userData?.user?.id || null;
}

// Watchlist logic
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

document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();             // Load existing notifications
  listenForNewNotifications();     // Real-time updates (optional)
  startNotificationPolling();
  startWinnerPolling();
});

function startWinnerPolling() {
  setInterval(async () => {
    const { data: latestBid, error: bidError } = await supabaseClient
      .from('bid')
      .select('bidder_id')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (bidError || !latestBid) return;

    const winningBidderId = latestBid.bidder_id;
    if (winningBidderId !== previousWinnerId) {
      const { error: updateError } = await supabaseClient
        .from('auction')
        .update({ winner_id: winningBidderId })
        .eq('id', auctionId);

      if (!updateError) previousWinnerId = winningBidderId;
    }
  }, 3000);
}

function startNotificationPolling() {
  setInterval(async () => {
    const { data: auctions, error: auctionsError } = await supabaseClient
      .from('auction')
      .select('id, current_price')
      .neq('status', 'completed');

    if (auctionsError) return;

    const { data: bids, error: bidsError } = await supabaseClient
      .from('bid')
      .select('id, auction_id, bidder_id, bid_amount')
      .eq('bidder_id', currentUserId)
      .order('created_at', { ascending: false });

    if (bidsError) return;

    bids.forEach(bid => {
      const auction = auctions.find(a => a.id === bid.auction_id);
      if (auction && bid.bid_amount < auction.current_price) {
        if (!previousBids[bid.auction_id] || previousBids[bid.auction_id] !== auction.current_price) {
          sendOutbidNotification(bid.auction_id);
          previousBids[bid.auction_id] = auction.current_price;
        }
      }
    });
  }, 3000);
}

async function sendOutbidNotification(auctionId) {
  const { data, error } = await supabaseClient
    .from('auction')
    .select('product(name), seller_id')
    .eq('id', auctionId)
    .single();

  if (!error && data) {
    await supabaseClient.from('notifications').insert([
      {
        user_id: currentUserId,
        auction_id: auctionId,
        message: `🔔 You have been outbid on "${data.product.name}".`,
        read: false
      }
    ]);
  }
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

  const { data: walletData, error: walletError } = await supabaseClient
    .from('wallet')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (walletError || !walletData || walletData.balance < bidAmount) {
    statusMessage.textContent = '❌ Insufficient wallet balance.';
    return;
  }

  const { data: previousBids } = await supabaseClient
    .from('bid')
    .select('bidder_id, bid_amount')
    .eq('auction_id', auctionId)
    .order('bid_amount', { ascending: false })
    .limit(2);

  await supabaseClient.from('bid').insert([
    { auction_id: auctionId, bidder_id: userId, bid_amount: bidAmount }
  ]);

  await supabaseClient
    .from('auction')
    .update({ current_price: bidAmount })
    .eq('id', auctionId);

  const { data: auctionInfo } = await supabaseClient
    .from('auction')
    .select('product(name), seller_id')
    .eq('id', auctionId)
    .single();

  const productName = auctionInfo.product?.name || 'your item';
  const sellerUserId = auctionInfo.seller_id;

  await supabaseClient.from('notifications').insert([
    {
      user_id: sellerUserId,
      auction_id: auctionId,
      message: `📢 Someone just placed a bid on your product: "${productName}"!`,
      read: false
    }
  ]);

  if (previousBids && previousBids.length > 1) {
    const previousBidderId = previousBids[1].bidder_id;
    if (previousBidderId !== userId) {
      await supabaseClient.from('notifications').insert([
        {
          user_id: previousBidderId,
          auction_id: auctionId,
          message: `🔔 You've been outbid on "${productName}".`,
          read: false
        }
      ]);
    }
  }

  statusMessage.textContent = '✅ Bid placed successfully!';
  bidAmountInput.value = '';
});
