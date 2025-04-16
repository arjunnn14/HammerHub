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
let currentSlide = 0;

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
    imageSlider.innerHTML = '<div class="slide"><p>No images available</p></div>';
  }

  endTime = new Date(data.end_time);
  sellerId = data.seller_id;
}

// Slide show function
function showSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.slider-dot');

  if (slides.length === 0) return;

  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  slides.forEach(slide => slide.classList.remove('active'));
  slides[index].classList.add('active');
  currentSlide = index;

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

  const timerInterval = setInterval(updateCountdown, 1000);
  updateCountdown();
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
