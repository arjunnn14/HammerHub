// auction-page.js

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
const endTimeInputEl = document.getElementById('auction-end-time');
const watchlistBtn = document.getElementById('watchlist-btn');
const auctionIdEl = document.getElementById('auction-id');

let endTime;
let currentPrice = 0;
let sellerId;

let currentUserId;

async function initPage() {
  if (!auctionId) {
    statusMessage.textContent = '❌ Invalid auction ID';
    return;
  }

  const {
    data: userData,
    error: userError
  } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id;

  if (currentUserId && auctionId) {
    await checkIfInWatchlist(currentUserId, auctionId);
  }

  await loadAuctionDetails();
  startCountdown();
  startPricePolling();
}

document.addEventListener('DOMContentLoaded', initPage);

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
  endTimeInputEl.value = data.end_time;
  sellerId = data.seller_id;
}

watchlistBtn.addEventListener('click', async () => {
  const inList = await isInWatchlist(currentUserId, auctionId);
  if (inList) {
    await removeFromWatchlist(currentUserId, auctionId);
  } else {
    await addToWatchlist(currentUserId, auctionId);
  }
  checkIfInWatchlist(currentUserId, auctionId);
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
  const inList = await isInWatchlist(userId, auctionId);
  watchlistBtn.textContent = inList ? '✅ In Watchlist' : '⭐ Add to Watchlist';
}

function startCountdown() {
  const endTime = new Date(endTimeInputEl.value);

  function updateCountdown() {
    const now = new Date();
    const diff = endTime - now;

    if (diff <= 0) {
      endTimeEl.textContent = 'Auction Ended';
      clearInterval(timerInterval);
      bidForm.style.display = 'none';
      updateAuctionWinner();
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    endTimeEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }

  const timerInterval = setInterval(updateCountdown, 1000);
  updateCountdown();
}

let previousWinnerId = null;

function startWinnerPolling() {
  setInterval(async () => {
    const { data: latestBid, error: bidError } = await supabaseClient
      .from('bid')
      .select('bidder_id')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();  // Only get the most recent bid

    if (bidError) {
      console.error('❌ Error fetching latest bid:', bidError);
      return;
    }

    if (!latestBid) {
      console.log('⚠️ No bids placed yet.');
      return;
    }

    const winningBidderId = latestBid.bidder_id;

    // Only update if the winner has changed
    if (winningBidderId !== previousWinnerId) {
      // Update the winner_id in the auction table
      const { error: updateError } = await supabaseClient
        .from('auction')
        .update({ winner_id: winningBidderId })
        .eq('id', auctionId);

      if (updateError) {
        console.error('❌ Error updating winner_id:', updateError);
      } else {
        console.log(`✅ Winner updated to bidder ID ${winningBidderId}`);
        previousWinnerId = winningBidderId;  // Update the stored previous winner
      }
    }
  }, 3000);  // Check every 3 seconds
}

document.addEventListener('DOMContentLoaded', startWinnerPolling);

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

  const { data: previousBids } = await supabaseClient
    .from('bid')
    .select('bidder_id, bid_amount')
    .eq('auction_id', auctionId)
    .order('bid_amount', { ascending: false })
    .limit(2);

  const { error: insertError } = await supabaseClient.from('bid').insert([
    { auction_id: auctionId, bidder_id: userId, bid_amount: bidAmount }
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
