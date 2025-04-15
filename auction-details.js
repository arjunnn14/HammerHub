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
const watchlistBtn = document.getElementById('watchlist-btn');

let endTime;
let currentPrice = 0;
let sellerId;
let currentUserId;

document.addEventListener('DOMContentLoaded', async () => {
  if (!auctionId) {
    statusMessage.textContent = '❌ Invalid auction ID';
    return;
  }

  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id;

  await markCompletedAuctions();
  await loadAuctionDetails();
  startCountdown();
  startPricePolling();
  if (currentUserId) {
    checkIfInWatchlist(currentUserId, auctionId);
  }

  // Setup notification dropdown
  setupNotificationDropdown();
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

function startCountdown() {
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

async function updateAuctionWinner() {
  const { data: bids, error: bidError } = await supabaseClient
    .from('bid')
    .select('bidder_id')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending:_
