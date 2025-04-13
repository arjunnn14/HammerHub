import { supabaseClient } from './supabase.js';

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadUserProfile();
    await loadUserAuctions();
    await loadUserBids();
    await loadUserWonAuctions();
    setupEditProfile();
  } catch (error) {
    console.error("Error initializing profile page:", error);
    alert("Failed to load profile data. Please refresh the page.");
  }
});

// Load and display user profile information
const loadUserProfile = async () => {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error) throw error;
    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    // Display user info in view mode
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userId").textContent = user.id;
    document.getElementById("userName").textContent = user.user_metadata?.full_name || "Not provided";

    // Pre-fill edit form
    document.getElementById("editUserEmail").value = user.email;
    document.getElementById("editUserId").textContent = user.id;
    document.getElementById("editUserName").value = user.user_metadata?.full_name || "";

  } catch (error) {
    console.error("Error loading user profile:", error);
    alert("Failed to load user profile. Please try again.");
  }
};

// Setup edit profile functionality
const setupEditProfile = () => {
  const editBtn = document.getElementById("editProfileBtn");
  const saveBtn = document.getElementById("saveProfileBtn");
  const viewSection = document.getElementById("profileInfoView");
  const editSection = document.getElementById("profileInfoEdit");

  editBtn.addEventListener("click", () => {
    viewSection.classList.add("hidden");
    editSection.classList.remove("hidden");
  });

  saveBtn.addEventListener("click", async () => {
    try {
      const newName = document.getElementById("editUserName").value;
      
      // Update user metadata in Supabase
      const { error } = await supabaseClient.auth.updateUser({
        data: { full_name: newName }
      });

      if (error) throw error;

      // Update displayed name
      document.getElementById("userName").textContent = newName || "Not provided";
      
      // Switch back to view mode
      viewSection.classList.remove("hidden");
      editSection.classList.add("hidden");

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  });
};

// Load user's auctions
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
      <li class="error">
        Error loading auctions. Please try again later.
        ${error.message ? `<br><small>${error.message}</small>` : ''}
      </li>
    `;
  }
};

// Load user's bids (updated with correct column name)
const loadUserBids = async () => {
  const bidsList = document.getElementById("bidsList");
  bidsList.innerHTML = "<li>Loading your bids...</li>";

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
      .from("bid")
      .select(`
        id,
        bid_amount,
        created_at,
        auction (
          id,
          current_price,
          product (
            name
          )
        )
      `)
      .eq("bidder_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      bidsList.innerHTML = "<li>You haven't placed any bids yet</li>";
      return;
    }

    bidsList.innerHTML = data.map(bid => `
      <li>
        <strong>${bid.auction.product.name}</strong><br>
        Your Bid: $${bid.bid_amount}<br>
        Current Price: $${bid.auction.current_price}<br>
        Placed: ${new Date(bid.created_at).toLocaleDateString()}<br>
        <a href="auction-details.html?id=${bid.auction.id}">View Auction</a>
      </li>
    `).join("");
  } catch (error) {
    console.error("Error loading bids:", error);
    bidsList.innerHTML = `
      <li class="error">
        Error loading bids. Please try again later.
        ${error.message ? `<br><small>${error.message}</small>` : ''}
      </li>
    `;
  }
};

// Load auctions the user has won
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
      <li class="error">
        Error loading won auctions. Please try again later.
        ${error.message ? `<br><small>${error.message}</small>` : ''}
      </li>
    `;
  }
};