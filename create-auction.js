import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  autoFillEndTime();
  setupImagePreview();
  document.getElementById('create-auction-form').addEventListener('submit', handleCreateAuction);
});

function autoFillEndTime() {
  const endInput = document.getElementById('end-time');
  const now = new Date();
  now.setDate(now.getDate() + 7);
  endInput.value = now.toISOString().slice(0, 16);
}

async function loadCategories() {
  const select = document.getElementById('category-select');
  const { data, error } = await supabaseClient.from('category').select('id, name');

  if (error) {
    console.error('❌ Failed to load categories:', error);
    return;
  }

  data.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
}

function setupImagePreview() {
  const fileInput = document.getElementById('product-image');
  const previewDiv = document.getElementById('image-preview');

  if (!fileInput || !previewDiv) {
    console.warn('⚠️ product-image or image-preview element not found');
    return;
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    previewDiv.innerHTML = '';

    if (!file) return;

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      previewDiv.innerHTML = `<p style="color: red;">❌ Image too large (max 3MB)</p>`;
      fileInput.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      previewDiv.innerHTML = `<p style="color: red;">❌ Invalid image type</p>`;
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      previewDiv.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

async function handleCreateAuction(event) {
  event.preventDefault();
  const statusMessage = document.getElementById('status-message');
  statusMessage.textContent = '⏳ Creating auction...';

  const name = document.getElementById('product-name').value.trim();
  const description = document.getElementById('product-description').value.trim();
  const categoryId = document.getElementById('category-select').value;
  const imageFileInput = document.getElementById('product-image');
  const imageFile = imageFileInput?.files[0];

  const startingPrice = parseFloat(document.getElementById('starting-price').value);
  const endTime = document.getElementById('end-time').value;

  if (!imageFile || isNaN(startingPrice) || !name || !description || !categoryId || !endTime) {
    statusMessage.textContent = '❌ Please fill in all fields.';
    return;
  }

  if (startingPrice <= 0) {
    statusMessage.textContent = '❌ Starting price must be greater than 0.';
    return;
  }

  const { data: userData, error: authError } = await supabaseClient.auth.getUser();
  const sellerId = userData?.user?.id;

  if (authError || !sellerId) {
    statusMessage.textContent = '❌ You must be logged in to create an auction.';
    return;
  }

  // Upload image
  const fileName = `${Date.now()}-${imageFile.name}`;
  const { error: uploadError } = await supabaseClient.storage
    .from('product-images')
    .upload(fileName, imageFile);

  if (uploadError) {
    console.error('Image upload error:', uploadError);
    statusMessage.textContent = '❌ Failed to upload image.';
    return;
  }

  const imageUrl = `https://jzcmbrqogyghyhvwzgps.supabase.co/storage/v1/object/public/product-images/${fileName}`;

  // Insert product
  const { data: productData, error: productError } = await supabaseClient.from('product').insert([{
    name,
    description,
    image_url: imageUrl,
    category_id: categoryId
  }]).select().single();

  if (productError) {
    console.error('Product insert error:', productError);
    statusMessage.textContent = '❌ Failed to create product.';
    return;
  }

  const productId = productData.id;

  // Insert auction
  const { data: auctionData, error: auctionError } = await supabaseClient.from('auction').insert([{
    product_id: productId,
    seller_id: sellerId,
    starting_price: startingPrice,
    current_price: startingPrice,
    end_time: endTime,
    status: 'active'
  }]).select().single();

  if (auctionError) {
    console.error('Auction insert error:', auctionError);
    statusMessage.textContent = '❌ Failed to create auction.';
    return;
  }

  statusMessage.textContent = '✅ Auction created! Redirecting...';
  setTimeout(() => {
    window.location.href = `auction-details.html?id=${auctionData.id}`;
  }, 1500);
}
