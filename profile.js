import { supabaseClient } from './supabase.js';
import './notification.js'; // Make sure this is only imported ONCE per page

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadUserProfile();
    await loadUserAuctions();
    await loadUserBids();  // ✅ Updated with full product details
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

    // View mode
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userId").textContent = user.id;
    document.getElementById("userName").textContent = user.user_metadata?.full_name || "Not provided";

    // Edit mode
    document.getElementById("editUserEmail").value = user.email;
    document.getElementById("editUserId").textContent = user.id;
    document.getElementById("editUserName").value = user.user_metadata?.full_name || "";

  } catch (error) {
    console.error("Error loading user profile:", error);
    alert("Failed to load user profile. Please try again.");
  }
};

// Enable profile edit mode
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

      const { error } = await supabaseClient.auth.updateUser({
        data: { full_name: newName }
      });

      if (error) throw error;

      document.getElementById("userName").textContent = newName || "Not provided";
      viewSection.classList.remove("hidden");
      editSection.classList.add("hidden");
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  });
};

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


