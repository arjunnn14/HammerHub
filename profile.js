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

  // Load user's bids
  async function loadUserBids() {
    const { data, error } = await supabaseClient
      .from('bid')
      .select(`
        bid_amount,
        auction:auction!bid_auction_id_fkey (
          product:product!auction_product_id_fkey (name)
        )
      `)
      .eq('bidder_id', userId);

    if (error) {
      console.error('❌ Error loading bids:', error);
      return;
    }

    bidsList.innerHTML = '';
    if (!data || data.length === 0) {
      bidsList.innerHTML = '<li>No bids placed</li>';
      return;
    }

    data.forEach(bid => {
      const li = document.createElement('li');
      li.textContent = `Bid ₹${bid.bid_amount} on ${bid.auction?.product?.name || 'Unnamed Product'}`;
      bidsList.appendChild(li);
    });
  }

  // Load user's won auctions
  async function loadUserWonAuctions() {
    const { data, error } = await supabaseClient
      .from('auction')
      .select('id, current_price, product:product!auction_product_id_fkey(name)')
      .eq('winner_id', userId);

    if (error) {
      console.error('❌ Error loading won auctions:', error);
      return;
    }

    wonAuctionsList.innerHTML = '';
    if (!data || data.length === 0) {
      wonAuctionsList.innerHTML = '<li>No auctions won</li>';
      return;
    }

    data.forEach(auction => {
      const li = document.createElement('li');
      li.textContent = `${auction.product?.name || 'Unnamed Product'} - ₹${auction.current_price}`;
      wonAuctionsList.appendChild(li);
    });
  }

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
