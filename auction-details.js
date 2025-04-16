import { supabaseClient } from './supabase.js';
import './notification.js'; // Ensure notifications are loaded once

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

// Load auction details with multiple image support
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

  // Set basic product info
  productNameEl.textContent = product.name;
  descriptionEl.textContent = product.description;
  categoryEl.textContent = product.category?.name || 'N/A';
  startingPriceEl.textContent = data.starting_price;
  currentPrice = data.current_price;
  currentPriceEl.textContent = currentPrice;

  // Handle multiple images
  const imageSlider = document.getElementById('image-slider');
  const dotsContainer = document.getElementById('slider-dots');

  if (imageSlider && dotsContainer) {
    imageSlider.innerHTML = '';
    dotsContainer.innerHTML = '';

    if (product.image_url && product.image_url.length > 0) {
      // Create slides for each image
      product.image_url.forEach((url, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.innerHTML = `<img src="${url}" alt="Product image ${index + 1}" />`;
        imageSlider.appendChild(slide);

        // Create navigation dot
        const dot = document.createElement('div');
        dot.className = 'slider-dot';
        dot.dataset.index = index;
        dot.addEventListener('click', () => showSlide(index));
        dotsContainer.appendChild(dot);
      });

      // Show first image
      showSlide(0);
    } else {
      // Fallback if no images available
      imageSlider.innerHTML = '<div class="slide"><p>No images available</p></div>';
    }
  } else {
    console.warn('Image slider or dots container element not found!');
  }

  // Set auction timing info
  endTime = new Date(data.end_time);
  sellerId = data.seller_id;

  updateCountdown();
}

// Slide show function
function showSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.slider-dot');

  if (slides.length === 0) return;

  // Handle wrap-around
  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  // Update display
  slides.forEach(slide => slide.classList.remove('active'));
  slides[index].classList.add('active');

  // Update navigation dots
  dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
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
    statusMessage.textContent = '⚠️ You cannot bid on your own auction.';
    return;
  }

  // Insert the new bid
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

  // Update the current price of the auction
  await supabaseClient
    .from('auction')
    .update({ current_price: bidAmount })
    .eq('id', auctionId);

  // Optionally, fetch updated auction information if needed
  statusMessage.textContent = '✅ Bid placed!';
  bidAmountInput.value = '';
});

// Helper functions

async function checkAuctionExists(auctionId) {
  const { data, error } = await supabaseClient
    .from('auction')
    .select('id')
    .eq('id', auctionId)
    .single();
  return !error && data;
}

async function checkUserExists() {
  const { data: userData } = await supabaseClient.auth.getUser();
  return userData?.user?.id || null;
}

// Watchlist helper functions
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

// Newly defined function to check the watchlist status
async function checkIfInWatchlist(userId, auctionId) {
  const btn = document.getElementById('watchlist-btn');
  const inList = await isInWatchlist(userId, auctionId);
  btn.textContent = inList ? '✅ In Watchlist' : '⭐ Add to Watchlist';
}
