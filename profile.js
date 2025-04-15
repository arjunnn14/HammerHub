import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = (await supabaseClient.auth.getUser()).data.user;
  if (!user) return alert('Please log in.');

  const userId = user.id;
  const userNameElem = document.getElementById('userName');
  const userEmailElem = document.getElementById('userEmail');
  const userIdElem = document.getElementById('userId');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const profileInfoView = document.getElementById('profileInfoView');
  const profileInfoEdit = document.getElementById('profileInfoEdit');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const editUserName = document.getElementById('editUserName');
  const editUserEmail = document.getElementById('editUserEmail');
  const auctionsList = document.getElementById('auctionsList');
  const bidsList = document.getElementById('bidsList');
  const wonAuctionsList = document.getElementById('wonAuctionsList');

  // Load user profile information
  async function loadUserProfile() {
    const { data, error } = await supabaseClient
      .from('user')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('❌ Error loading user profile:', error);
      return;
    }

    userNameElem.textContent = data.full_name || 'N/A';
    userEmailElem.textContent = data.email || 'N/A';
    userIdElem.textContent = data.id;

    editUserName.value = data.full_name || '';
    editUserEmail.value = data.email || '';
  }

  // Toggle edit mode
  editProfileBtn.addEventListener('click', () => {
    profileInfoView.classList.add('hidden');
    profileInfoEdit.classList.remove('hidden');
  });

  // Save profile changes
  saveProfileBtn.addEventListener('click', async () => {
    const updatedName = editUserName.value;
    const updatedEmail = editUserEmail.value;

    const { error } = await supabaseClient
      .from('user')
      .update({ full_name: updatedName, email: updatedEmail })
      .eq('id', userId);

    if (error) {
      console.error('❌ Failed to update profile:', error);
      alert('Failed to update profile!');
      return;
    }

    alert('Profile updated successfully!');
    loadUserProfile();
    profileInfoView.classList.remove('hidden');
    profileInfoEdit.classList.add('hidden');
  });

  // Load user's auctions
  async function loadUserAuctions() {
    const { data, error } = await supabaseClient
      .from('auction')
      .select('id, current_price, product:product!auction_product_id_fkey(name)')
      .eq('seller_id', userId);

    if (error) {
      console.error('❌ Error loading auctions:', error);
      return;
    }

    auctionsList.innerHTML = '';
    if (!data || data.length === 0) {
      auctionsList.innerHTML = '<li>No auctions found</li>';
      return;
    }

    data.forEach(auction => {
      const li = document.createElement('li');
      li.textContent = `${auction.product?.name || 'Unnamed Product'} - ₹${auction.current_price}`;
      auctionsList.appendChild(li);
    });
  }

// Load user's created auctions
const loadUserAuctions = async () => {
  const auctionsList = document.getElementById("auctionsList");
  auctionsList.innerHTML = "<li>Loading your auctions...</li>";

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
      .from("auction")
      .select(`
        id,
        current_price,
        created_at,
        product (
          name
        )
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      auctionsList.innerHTML = "<li>You haven't created any auctions yet</li>";
      return;
    }

    auctionsList.innerHTML = data.map(auction => `
      <li>
        <strong>${auction.product.name}</strong><br>
        Price: $${auction.current_price}<br>
        Created: ${new Date(auction.created_at).toLocaleDateString()}<br>
        <a href="auction-details.html?id=${auction.id}">View Auction</a>
      </li>
    `).join("");

  } catch (error) {
    console.error("Error loading auctions:", error);
    auctionsList.innerHTML = `
      <li class="error">Error loading auctions. Please try again later.<br><small>${error.message}</small></li>
    `;
  }
};

// ✅ Load user's bids and show product details
const loadUserBids = async () => {
  const bidsList = document.getElementById("bidsList");
  bidsList.innerHTML = "<li>Loading your bids...</li>";

  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) return (bidsList.innerHTML = "<li>User not found</li>");

    const { data: bids, error } = await supabaseClient
      .from("bid")
      .select(`
        id,
        bid_amount,
        created_at,
        auction:auction_id (
          id,
          current_price,
          end_time,
          product:product_id (
            name,
            description,
            image_url
          )
        )
      `)
      .eq("bidder_id", user.id)
      .order("created_at", { ascending: false });

      console.log("BIDS RAW RESPONSE:", bids);
      console.log("ERROR:", error);

    if (error) throw error;

    if (!bids || bids.length === 0) {
      bidsList.innerHTML = "<li>You haven't placed any bids yet</li>";
      return;
    }

    bidsList.innerHTML = bids.map(bid => {
      const auction = bid.auction;
      const product = auction?.product;
      const productName = product?.name || "Unknown Product";
      const productDesc = product?.description || "No description";
      const imageUrl = product?.image_url || "placeholder.jpg"; // fallback image
      const auctionId = auction?.id || "#";
      const currentPrice = auction?.current_price ?? "N/A";
      const endTime = auction?.end_time ? new Date(auction.end_time).toLocaleString() : "N/A";

      return `
        <li>
          <img src="${imageUrl}" alt="${productName}" style="width: 100px; height: 100px; object-fit: cover;" /><br>
          <strong>${productName}</strong><br>
          ${productDesc}<br>
          Your Bid: $${bid.bid_amount}<br>
          Current Price: $${currentPrice}<br>
          Ends: ${endTime}<br>
          <a href="auction-details.html?id=${auctionId}">View Auction</a>
        </li>
      `;
    }).join("");

  } catch (error) {
    console.error("Error loading bids:", error);
    bidsList.innerHTML = `
      <li class="error">Error loading bids. Please try again later.<br><small>${error.message}</small></li>
    `;
  }
};

// Load user's won auctions
const loadUserWonAuctions = async () => {
  const wonList = document.getElementById("wonAuctionsList");
  wonList.innerHTML = "<li>Loading your won auctions...</li>";

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
      .from("auction")
      .select(`
        id,
        current_price,
        created_at,
        product (
          name
        )
      `)
      .eq("winner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      wonList.innerHTML = "<li>You haven't won any auctions yet</li>";
      return;
    }

    wonList.innerHTML = data.map(auction => `
      <li>
        <strong>${auction.product.name}</strong><br>
        Winning Price: $${auction.current_price}<br>
        Won on: ${new Date(auction.created_at).toLocaleDateString()}<br>
        <a href="auction-details.html?id=${auction.id}">View Details</a>
      </li>
    `).join("");

  } catch (error) {
    console.error("Error loading won auctions:", error);
    wonList.innerHTML = `
      <li class="error">Error loading won auctions. Please try again later.<br><small>${error.message}</small></li>
    `;
  }
};

  async function loadWalletBalance() {
    const { data, error } = await supabaseClient
      .from('wallet')
      .select('balance')
      .eq('user_id', userId)
      .single();
  
    if (error) {
      console.error('❌ Error loading wallet:', error);
      document.getElementById('walletBalance').textContent = 'Error';
      return;
    }
  
    document.getElementById('walletBalance').textContent = `₹${data.balance.toFixed(2)}`;
  }

  // Initial data load
  await loadUserProfile();
  await loadUserAuctions();
  await loadUserBids();
  await loadUserWonAuctions();
  await loadWalletBalance();
});
