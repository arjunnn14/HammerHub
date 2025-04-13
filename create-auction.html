<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Create Auction - HammerHub</title>
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cropperjs/dist/cropper.min.css" />
  <style>
    body {
      margin: 0;
      font-family: 'Segoe UI', sans-serif;
      background-color: #000;
      color: #fff;
    }

    header {
      background-color: #111;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #222;
    }

    .logo {
      height: 40px;
      cursor: pointer;
    }

    .auth-buttons {
      display: flex;
      gap: 1rem;
    }

    .auth-btn {
      background-color: #222;
      color: #fff;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .auth-btn.primary {
      background-color: #facc15;
      color: #000;
      font-weight: 600;
    }

    main {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      gap: 2rem;
    }

    #create-auction-form {
      background-color: #1a1a1a;
      padding: 2rem;
      border-radius: 12px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
      animation: fadeIn 0.8s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    #create-auction-form h2 {
      text-align: center;
      color: #facc15;
      margin-bottom: 1.5rem;
    }

    .form-group {
      position: relative;
      margin-bottom: 1rem;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      background-color: #000;
      border: 1px solid #444;
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      border-color: #facc15;
      outline: none;
    }

    .form-group i {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #888;
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    #image-preview img {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 0.5rem;
    }

    button[type="submit"] {
      width: 100%;
      padding: 0.75rem;
      background-color: #facc15;
      color: #000;
      font-weight: bold;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.3s ease;
    }

    button[type="submit"]:hover {
      background-color: #eab308;
    }

    #status-message {
      text-align: center;
      margin-top: 1rem;
      font-weight: 500;
    }

    .preview-card {
      background-color: #1a1a1a;
      padding: 1rem;
      border-radius: 12px;
      max-width: 300px;
      width: 100%;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
      text-align: center;
      animation: fadeIn 0.5s ease-in-out;
    }

    .preview-card img {
      max-width: 100%;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .spinner {
      border: 4px solid #fff;
      border-top: 4px solid #facc15;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>

  <header>
    <img src="logo.png" alt="HammerHub Logo" class="logo" id="logo-home" />
    <div class="auth-buttons" id="auth-buttons">
      <div class="notification-wrapper">
        <span id="notification-bell" class="notification-bell">🔔</span>
        <span id="notification-badge" class="notification-badge hidden">0</span>
        <ul id="notification-list" class="notification-list hidden"></ul>
      </div>
  
      <button class="auth-btn" onclick="window.location.href='create-auction.html'">➕ Create Auction</button>
      <button class="auth-btn" onclick="window.location.href='watchlist.html'">⭐ Watchlist</button>
      <button class="auth-btn" onclick="window.location.href='profile.html'">👤 Profile</button>
      <button class="auth-btn primary" onclick="logout()">Logout</button>
    </div>
  </header>

  <main>
    <form id="create-auction-form">
      <h2>Create Auction</h2>

      <div class="form-group">
        <input type="text" id="product-name" placeholder="Product Name" required />
        <i></i>
      </div>

      <div class="form-group">
        <textarea id="product-description" placeholder="Product Description" required></textarea>
        <i></i>
      </div>

      <div class="form-group">
        <select id="category-select" required>
          <option value="">Select Category</option>
        </select>
        <i></i>
      </div>

      <div class="form-group">
        <input type="file" id="product-image" accept="image/*" required />
        <i></i>
      </div>
      <div id="image-preview"></div>

      <div class="form-group">
        <input type="number" id="starting-price" placeholder="Starting Price (₹)" min="1" required />
        <i></i>
      </div>

      <div class="form-group">
        <input type="datetime-local" id="end-time" required />
        <i></i>
      </div>

      <button type="submit" id="submit-button">Create Auction</button>
      <div id="status-message"></div>
    </form>

    <!-- Live Preview -->
    <div class="preview-card" id="live-preview" style="display:none;">
      <img id="preview-image" src="" alt="Preview Image" />
      <h3 id="preview-title"></h3>
      <p id="preview-price"></p>
    </div>
  </main>

  <footer>
    <p>© 2025 HammerHub. All rights reserved.</p>
    <p>Contact us: <a href="mailto:HammerHub@gmail.com" style="color: #facc15;">HammerHub@gmail.com</a> | 123 456 7890</p>
  </footer>

  <script type="module" src="create-auction.js"></script>
  <script>
    document.getElementById('logo-home').addEventListener('click', () => {
      window.location.href = 'homepage.html';
    });

    // Define logout function to use inline in button
    async function logout() {
      const { supabaseClient } = await import('./supabase.js');
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    }
  </script>

</body>
</html>
