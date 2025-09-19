// app.js
async function handleGoogleSignIn(response) {
    const googleToken = response.credential;
    const API_URL = 'http://localhost:3000/api';
    try {
        const res = await fetch(`${API_URL}/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        localStorage.setItem('user', JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
    } catch (error) {
        console.error('Login Error:', error);
        // Using a custom message element instead of alert
        const loginMessageEl = document.getElementById('login-message');
        if (loginMessageEl) {
            loginMessageEl.textContent = `Login failed: ${error.message}`;
            loginMessageEl.style.color = 'red';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const mainElement = document.querySelector('main');
    const productList = document.getElementById('product-list');
    const bestSellersList = document.getElementById('best-sellers-list');
    const specialOffersList = document.getElementById('special-offers-list');
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const productDetailsModal = document.getElementById('product-details-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    const pageSections = document.querySelectorAll('.page-section');
    const searchInput = document.getElementById('search-input');
    const categoryFilterList = document.getElementById('category-filter-list');
    const brandFilterList = document.getElementById('brand-filter-list');
    const userIconLink = document.getElementById('user-icon-link');
    const accountSection = document.getElementById('account-section');
    const accountInfoForm = document.getElementById('account-info-form');
    const accountUsernameSidebar = document.getElementById('account-username-sidebar');
    const accountNameInput = document.getElementById('account-name');
    const accountEmailInput = document.getElementById('account-email');
    const accountMobileInput = document.getElementById('account-mobile');
    const saveAccountInfoBtn = document.getElementById('save-account-info-btn');
    const accountNavLinks = document.querySelectorAll('.account-nav a');
    const userOrdersTbodyAccount = document.getElementById('user-orders-tbody-account');
    const accountSignOutBtn = document.getElementById('account-signout-btn');
    const orderDetailsModal = document.getElementById('order-details-modal');
    const orderDetailsBody = document.getElementById('order-details-body');
    const reviewModal = document = document.getElementById('review-modal');
    const reviewModalBody = document.getElementById('review-modal-body');
    const submitReviewsBtn = document.getElementById('submit-reviews-btn');
    const sliderWrapper = document.querySelector('.slider-wrapper');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const contactForm = document.getElementById('feedback-form');
    const contactMessageEl = document.getElementById('contact-form-message');
    const categoryShowcaseGrid = document.querySelector('.category-showcase-grid');

    // NEW CHECKOUT PAGE ELEMENTS
    const checkoutSection = document.getElementById('checkout-section');
    const checkoutAddressForm = document.getElementById('checkout-address-form');
    const checkoutName = document.getElementById('checkout-name');
    const checkoutMobile = document.getElementById('checkout-mobile');
    const checkoutEmail = document.getElementById('checkout-email');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryGst = document.getElementById('summary-gst');
    const summaryTotal = document.getElementById('summary-total');
    
    // NEW PAYMENT METHOD ELEMENTS
    const paymentOptions = document.getElementsByName('payment-method');
    const onlinePaymentDetails = document.getElementById('online-payment-details');
    const checkoutPayButton = document.getElementById('checkout-pay-button');


    const API_URL = 'http://localhost:3000/api';
    let allProducts = [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let currentUser = null;
    let slideIndex = 0;

    const getFromLocalStorage = (key) => JSON.parse(localStorage.getItem(key));
    const getAuthHeaders = () => {
        const user = getFromLocalStorage('user');
        const headers = { 'Content-Type': 'application/json' };
        if (user && user.token) headers['Authorization'] = `Bearer ${user.token}`;
        return headers;
    };

    function showSlide(index) {
        const slides = document.querySelectorAll('.slider-slide');
        if (!slides.length) return;
        if (index >= slides.length) { slideIndex = 0; }
        if (index < 0) { slideIndex = slides.length - 1; }
        if (sliderWrapper) {
            sliderWrapper.style.transform = `translateX(${-slideIndex * 100}%)`;
        }
    }

    function nextSlide() {
        slideIndex++;
        showSlide(slideIndex);
    }

    function prevSlide() {
        slideIndex--;
        showSlide(slideIndex);
    }

    function showSection(targetId) {
        pageSections.forEach(s => s.style.display = 'none');
        const target = document.getElementById(`${targetId}-section`);
        if (target) target.style.display = 'block';
        else document.getElementById('home-section').style.display = 'block';
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${targetId}`));

        const categoryShowcaseSection = document.querySelector('.category-showcase-section');
        if (categoryShowcaseSection) {
            categoryShowcaseSection.style.display = (targetId === 'home') ? 'block' : 'none';
        }

        if (targetId === 'account') {
            fetchAndDisplayAccountDetails();
            fetchAndDisplayUserOrders();
        }
    }

    async function fetchProducts() {
        try {
            const res = await fetch(`${API_URL}/products`);
            allProducts = await res.json();
            populateCategories();
            populateBrands();
            filterAndDisplayProducts();
            displayProducts(allProducts.slice(0, 4), bestSellersList, 'homepage');
            displayProducts(allProducts.slice(4, 8), specialOffersList, 'homepage');
        } catch (err) { console.error('Failed to fetch products:', err); }
    }

    function populateCategories() {
        const categories = [...new Set(allProducts.map(p => getProductCategory(p.name)))];
        categoryFilterList.innerHTML = `<li><a href="#" class="category-link active" data-category="all">All Products</a></li>` + 
            categories.sort().map(c => `<li><a href="#" class="category-link" data-category="${c}">${c}</a></li>`).join('');
    }

    function populateBrands() {
        const brands = [...new Set(allProducts.map(p => p.brand))].filter(Boolean);
        brandFilterList.innerHTML = `<li><a href="#" class="brand-link active" data-brand="all">All Brands</a></li>` +
            brands.sort().map(b => `<li><a href="#" class="brand-link" data-brand="${b}">${b}</a></li>`).join('');
    }

    function filterAndDisplayProducts() {
        const term = searchInput.value.toLowerCase();
        const category = categoryFilterList.querySelector('.active')?.dataset.category || 'all';
        const brand = brandFilterList.querySelector('.active')?.dataset.brand || 'all';
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(term) &&
            (category === 'all' || getProductCategory(p.name) === category) &&
            (brand === 'all' || p.brand === brand)
        );
        displayProducts(filtered, productList, 'full');
    }

    const getProductCategory = (name) => {
        name = name.toLowerCase();
        if (name.includes('bulb') || name.includes('led') || name.includes('light') || name.includes('lamp') || name.includes('illumination') || name.includes('batten')) return 'Lighting';
        if (name.includes('fan') || name.includes('exhaust')) return 'Fans';
        if (name.includes('wire') || name.includes('cable') || name.includes('cord') || name.includes('conduit') || name.includes('tape') || name.includes('connector')) return 'Wiring';
        if (name.includes('mcb') || name.includes('switch') || name.includes('plug') || name.includes('contactor') || name.includes('relay') || name.includes('starter') || name.includes('protector') || name.includes('breaker') || name.includes('fuse')) return 'Safety';
        if (name.includes('meter') || name.includes('tester') || name.includes('multimeter')) return 'Measuring Instruments';
        if (name.includes('inverter') || name.includes('solar') || name.includes('power bank')) return 'Power Solutions';
        if (name.includes('tools') || name.includes('tool') || name.includes('screwdriver') || name.includes('soldering') || name.includes('stripper') || name.includes('crimping')) return 'Tools & Equipment';
        if (name.includes('kettle') || name.includes('heater') || name.includes('iron')) return 'Appliances';
        return 'Other';
    };

    function displayProducts(products, container, type) {
        container.innerHTML = products.map(p => {
            const price = `₹${parseFloat(p.price).toFixed(2)}`;
            const image = `<img src="${p.image_url || 'https://placehold.co/600x400/EEE/31343C?text=No+Image'}" alt="${p.name}">`;
            let stockBadge = '';
            if (p.stock === 0) {
                stockBadge = '<div class="out-of-stock-badge">Out of Stock</div>';
            } else if (p.stock < 10) {
                stockBadge = '<div class="low-stock-badge">Only a few left</div>';
            }

            if (type === 'homepage') {
                return `
                    <div class="product-item-small" data-product-id="${p.id}">
                        <div class="image-container">${image}</div>
                        ${stockBadge || `<h4>Up to ${Math.floor(Math.random()*30+20)}% Off*</h4>`}
                        <p>${p.name}</p>
                    </div>`;
            }

            return `
                <div class="product-card" data-product-id="${p.id}">
                    <div class="product-image-container">
                        ${image.replace('>',' class="product-image">')}
                        ${stockBadge}
                    </div>
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        <p class="product-brand">${p.brand||''}</p>
                        <div class="product-footer">
                            <span class="product-price">${price}</span>
                            <button class="btn btn-primary add-to-cart-btn" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" ${p.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
        if (products.length === 0) container.innerHTML = '<p>No products found.</p>';
    }


    async function showProductDetails(productId) {
        const product = allProducts.find(p => p.id == productId);
        if (!product) return;
        const contentContainer = productDetailsModal.querySelector('.product-details-content');
        let stockBadge = '';
        if (product.stock === 0) {
            stockBadge = '<div class="out-of-stock-badge">Out of Stock</div>';
        } else if (product.stock < 10) {
            stockBadge = '<div class="low-stock-badge">Only a few left</div>';
        }
        const addToCartButton = product.stock > 0
            ? `<button class="btn add-to-cart-btn" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">Add to Cart</button>`
            : `<button class="btn add-to-cart-btn" disabled>Out of Stock</button>`;
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="product-details-main">
                    <div class="product-details-image">
                        <img src="${product.image_url || 'https://placehold.co/600x400/EEE/31343C?text=No+Image'}" alt="${product.name}">
                        ${stockBadge}
                    </div>
                    <div class="product-details-info">
                        <h2>${product.name}</h2>
                        <p class="brand">By ${product.brand}</p>
                        <p class="description">${product.description || 'No detailed description available.'}</p>
                        <div class="product-actions">
                            <span class="price">₹${parseFloat(product.price).toFixed(2)}</span>
                            <div class="action-buttons">
                                ${addToCartButton}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="reviews-section-container">
                    <div class="reviews-section">
                        <h3>Customer Reviews</h3>
                        <div id="reviews-list"></div>
                    </div>
                </div>
                <span class="close-button" data-modal="product-details-modal">&times;</span>`;
            
            const reviewsList = contentContainer.querySelector('#reviews-list');
            try {
                const res = await fetch(`${API_URL}/reviews/${productId}`);
                const reviews = await res.json();
                if (reviews.length > 0) {
                    reviewsList.innerHTML = reviews.map(r => `
                        <div class="review-item">
                            <div class="review-header">
                                <strong>${r.username}</strong>
                                <span class="star-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                            </div>
                            <p>${r.comment}</p>
                            ${r.image_url ? `<img src="${r.image_url}" alt="Review image" class="review-image">` : ''}
                        </div>
                    `).join('');
                } else {
                    reviewsList.innerHTML = '<p>No reviews yet.</p>';
                }
            } catch (err) {
                reviewsList.innerHTML = '<p>Could not load reviews.</p>';
            }
        }
        openModal(productDetailsModal);
    }

    function handleAddToCart(button) {
        const { id, name, price } = button.dataset;
        if (!id || !name || !price) return console.error('Product data missing.');
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) return alert('Price is invalid.');
        const item = cart.find(i => i.id === id);
        if (item) item.quantity++;
        else cart.push({ id, name, price: parsedPrice, quantity: 1 });
        updateCart();
    }

    function updateCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems();
        updateCartTotal();
        updateCartIcon();
    }

    function renderCartItems() {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item"><div class="cart-item-info"><h4>${item.name||'Unnamed'}</h4><p>${(typeof item.price==='number')?`₹${item.price.toFixed(2)}`:'N/A'}</p></div>
            <div class="cart-item-controls"><button class="quantity-btn" data-id="${item.id}" data-change="-1">-</button><span>${item.quantity}</span><button class="quantity-btn" data-id="${item.id}" data-change="1">+</button><button class="remove-item-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button></div></div>`
        ).join('');
        if (cart.length === 0) cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
    }

    const updateCartTotal = () => { const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0); cartTotalPrice.textContent = total.toFixed(2); return total; };
    function updateCartIcon() { cartCount.textContent = cart.reduce((s, i) => s + i.quantity, 0); cartIcon.classList.add('pop'); setTimeout(() => cartIcon.classList.remove('pop'), 300); }

    function handleCartActions(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!id) return;
        const item = cart.find(i => i.id === id);
        if (btn.classList.contains('quantity-btn')) {
            const change = parseInt(btn.dataset.change);
            if (item) item.quantity += change;
            if (item && item.quantity <= 0) cart = cart.filter(i => i.id !== id);
        } else if (btn.classList.contains('remove-item-btn')) {
            cart = cart.filter(i => i.id !== id);
        }
        updateCart();
    }

    const openModal = (modal) => modal.style.display = 'block';
    const closeModal = (modal) => modal.style.display = 'none';

    async function updateUserUI() {
        currentUser = getFromLocalStorage('user');
        authLinks.style.display = currentUser ? 'none' : 'flex';
        userInfo.style.display = currentUser ? 'flex' : 'none';
        userIconLink.style.display = currentUser ? 'block' : 'none';
    }

    async function fetchAndDisplayUserOrders() {
        if (!currentUser || !currentUser.user || !currentUser.user.id) return;
        const tbody = document.querySelector('#account-section[style*="block"] #user-orders-tbody-account');
        if (!tbody) return;
        try {
            const res = await fetch(`${API_URL}/orders/user/${currentUser.user.id}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Could not fetch orders.');
            const orders = await res.json();
            tbody.innerHTML = orders.map(o => {
                let actions = `<button class="btn-view" data-order-id="${o.order_id}">View</button>`;
                if (o.status === 'Delivered') {
                    actions += ` <button class="btn-review" data-order-id="${o.order_id}">Review</button>`;
                }
                return `<tr><td>#${o.order_id}</td><td>${new Date(o.order_date).toLocaleDateString()}</td><td>${o.item_count > 1 ? `${o.item_count} items` : o.products}</td><td>₹${parseFloat(o.total_amount).toFixed(2)}</td><td><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td><td>${actions}</td></tr>`;
            }).join('');
            if (orders.length === 0) tbody.innerHTML = '<tr><td colspan="6">No orders yet.</td></tr>';
        } catch (err) { console.error('Failed to fetch orders:', err); if(tbody) tbody.innerHTML = '<tr><td colspan="6">Could not load orders.</td>'; }
    }

    const handleLogout = () => { currentUser = null; localStorage.removeItem('user'); updateUserUI(); showSection('home'); };

    async function fetchAndDisplayAccountDetails() {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_URL}/user/details`, { headers: getAuthHeaders() });
            const details = await res.json();
            accountUsernameSidebar.textContent = details.username;
            accountNameInput.value = details.username;
            accountEmailInput.value = details.email;
            accountMobileInput.value = details.mobile_number || '';
            checkoutName.value = details.username;
            checkoutEmail.value = details.email;
            checkoutMobile.value = details.mobile_number || '';
        } catch (err) { console.error('Could not fetch account details:', err); }
    }

    function handleAccountNav(e) {
        e.preventDefault();
        const targetId = e.currentTarget.dataset.target;
        accountNavLinks.forEach(l => l.parentElement.classList.remove('active'));
        e.currentTarget.parentElement.classList.add('active');
        document.querySelectorAll('.account-content-panel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById(targetId);
        if (panel) panel.style.display = 'block';
        if (targetId === 'orders-content') fetchAndDisplayUserOrders();
    }

    function handleEditField(e) {
        e.preventDefault();
        const fieldId = e.target.dataset.field;
        const input = document.getElementById(fieldId);
        // Only allow editing for the name and mobile number fields
        if (fieldId === 'account-name' || fieldId === 'account-mobile') {
            input.readOnly = false;
            input.focus();
            // Get the corresponding 'Edit' button and hide it
            const editButton = e.target;
            editButton.style.display = 'none';
        }
        // Show the Save Changes button
        saveAccountInfoBtn.style.display = 'inline-block';
    }

    async function handleSaveAccountInfo(e) {
        e.preventDefault();
        const msgEl = document.getElementById('account-form-message');
        const data = { username: accountNameInput.value, mobile_number: accountMobileInput.value };
        try {
            const res = await fetch(`${API_URL}/user/details`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to save.');
            msgEl.textContent = result.message;
            msgEl.style.color = 'green';
            await fetchAndDisplayAccountDetails();
            accountNameInput.readOnly = true;
            accountMobileInput.readOnly = true;
            saveAccountInfoBtn.style.display = 'none';

            // Show the "Edit" buttons again
            accountInfoForm.querySelectorAll('.edit-btn').forEach(btn => btn.style.display = 'inline-block');
        } catch (err) { msgEl.textContent = `Error: ${err.message}`; msgEl.style.color = 'red'; } 
        finally { setTimeout(() => msgEl.textContent = '', 4000); }
    }

    // NEW: Function to open the checkout page
    function openCheckoutPage() {
        if (!currentUser) {
            const cartMessageEl = document.getElementById('cart-modal').querySelector('.modal-header');
            const p = document.createElement('p');
            p.textContent = 'Please log in to proceed to checkout.';
            p.style.color = 'red';
            p.style.textAlign = 'center';
            p.style.marginTop = '10px';
            cartMessageEl.appendChild(p);
            setTimeout(() => p.remove(), 4000);
            return;
        }
        if (cart.length === 0) {
            const cartMessageEl = document.getElementById('cart-modal').querySelector('.modal-header');
            const p = document.createElement('p');
            p.textContent = 'Your cart is empty.';
            p.style.color = 'red';
            p.style.textAlign = 'center';
            p.style.marginTop = '10px';
            cartMessageEl.appendChild(p);
            setTimeout(() => p.remove(), 4000);
            return;
        }

        closeModal(cartModal);
        showSection('checkout');
        updateOrderSummary();
        fetchAndDisplayAccountDetails();
    }

    // NEW: Function to update the order summary
    function updateOrderSummary() {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const gstRate = 0.18;
        const gst = subtotal * gstRate;
        const total = subtotal + gst;

        summarySubtotal.textContent = total > 0 ? subtotal.toFixed(2) : '0.00';
        summaryGst.textContent = total > 0 ? gst.toFixed(2) : '0.00';
        summaryTotal.textContent = total > 0 ? total.toFixed(2) : '0.00';
    }
    
    // NEW: Function to handle the payment and order confirmation
    async function handlePaymentAndOrder(e) {
        e.preventDefault();
        const paymentForm = document.getElementById('checkout-address-form');
        const paymentMessage = document.getElementById('checkout-message');
        const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked');
        const payButton = document.getElementById('checkout-pay-button');

        if (!selectedPaymentMethod) {
            paymentMessage.textContent = 'Please select a payment method.';
            paymentMessage.style.color = 'red';
            return;
        }

        // Collect all form data for the shipping address
        const shippingAddress = {
            full_name: document.getElementById('checkout-name').value,
            mobile_number: document.getElementById('checkout-mobile').value,
            email: document.getElementById('checkout-email').value,
            address_line_1: document.getElementById('checkout-address1').value,
            address_line_2: document.getElementById('checkout-address2').value,
            city: document.getElementById('checkout-city').value,
            postal_code: document.getElementById('checkout-zip').value,
            country: document.getElementById('checkout-country').value
        };

        const orderData = {
            total_amount: parseFloat(summaryTotal.textContent),
            items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price })),
            payment_method: selectedPaymentMethod.value,
            shipping_address: shippingAddress // Add the new address data to the payload
        };

        if (selectedPaymentMethod.value === 'cod') {
            payButton.textContent = 'Placing Order...';
            payButton.disabled = true;

            try {
                const res = await fetch(`${API_URL}/orders`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderData)
                });
                const result = await res.json();
                if (!res.ok || !result.success) {
                    throw new Error(result.error || 'Failed to place order.');
                }
                paymentMessage.textContent = 'Order placed successfully! Thank you for your purchase.';
                paymentMessage.style.color = 'green';
                
                setTimeout(() => {
                    showSection('account');
                    cart = [];
                    updateCart();
                }, 2000);

            } catch (err) {
                console.error('Order placement failed:', err);
                paymentMessage.textContent = `Order placement failed: ${err.message}`;
                paymentMessage.style.color = 'red';
                payButton.textContent = 'SAVE AND CONTINUE';
                payButton.disabled = false;
            }
        } else if (selectedPaymentMethod.value === 'online') {
            const onlinePaymentType = document.getElementById('online-payment-type').value;
            paymentMessage.textContent = `Redirecting to ${onlinePaymentType.toUpperCase()} payment gateway... (This is a demo)`;
            paymentMessage.style.color = 'orange';
            payButton.disabled = true;

            // This is a simple demo of the online payment flow.
            // You can replace this with your actual payment gateway integration (e.g., Razorpay, Stripe).
            setTimeout(async () => {
                try {
                    const res = await fetch(`${API_URL}/orders`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(orderData)
                    });
                    const result = await res.json();
                    if (!res.ok || !result.success) {
                        throw new Error(result.error || 'Failed to place order.');
                    }
                    paymentMessage.textContent = 'Payment successful and order placed!';
                    paymentMessage.style.color = 'green';
                    
                    setTimeout(() => {
                        showSection('account');
                        cart = [];
                        updateCart();
                    }, 2000);
                } catch (err) {
                    console.error('Order confirmation failed:', err);
                    paymentMessage.textContent = `Order confirmation failed: ${err.message}`;
                    paymentMessage.style.color = 'red';
                } finally {
                    payButton.disabled = false;
                    payButton.textContent = 'Pay Now';
                }
            }, 3000);
        }
    }
    
    async function showOrderDetails(orderId) {
        orderDetailsBody.innerHTML = '<p>Loading...</p>';
        openModal(orderDetailsModal);
        try {
            const res = await fetch(`${API_URL}/orders/details/${orderId}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Could not fetch order details.');
            const items = await res.json();
            orderDetailsBody.innerHTML = `<div class="order-details-list">${items.map(i => `
                <div class="order-details-item"><div class="order-item-image"><img src="${i.image_url||'https://placehold.co/100x100/EEE/31343C?text=No+Image'}" alt="${i.name}"></div>
                <div class="order-item-info"><h4>${i.name}</h4><p>Quantity: ${i.quantity}</p><p>Price: ₹${parseFloat(i.price).toFixed(2)}</p></div></div>`
            ).join('')}</div>`;
        } catch (err) { console.error('Failed to show order details:', err); orderDetailsBody.innerHTML = '<p>Could not load details.</p>'; }
    }
    
    async function openReviewModal(orderId) {
        reviewModalBody.innerHTML = '<p>Loading products...</p>';
        openModal(reviewModal);
        try {
            const res = await fetch(`${API_URL}/orders/details/${orderId}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Could not fetch products for review.');
            const items = await res.json();
            let reviewFormHtml = '<div class="review-product-list">';
            items.forEach(item => {
                reviewFormHtml += `
                    <div class="review-product-item" data-product-id="${item.product_id}">
                        <div class="review-product-header">
                            <div class="review-product-image"><img src="${item.image_url || 'https://placehold.co/100x100/EEE/31343C?text=No+Image'}" alt="${item.name}"></div>
                            <h4 class="review-product-name">${item.name}</h4>
                        </div>
                        <div class="review-form-group">
                            <label>Your Rating</label>
                            <div class="star-rating-input">
                                <input type="radio" id="star5-${item.product_id}" name="rating-${item.product_id}" value="5"><label for="star5-${item.product_id}">☆</label>
                                <input type="radio" id="star4-${item.product_id}" name="rating-${item.product_id}" value="4"><label for="star4-${item.product_id}">☆</label>
                                <input type="radio" id="star3-${item.product_id}" name="rating-${item.product_id}" value="3"><label for="star3-${item.product_id}">☆</label>
                                <input type="radio" id="star2-${item.product_id}" name="rating-${item.product_id}" value="2"><label for="star2-${item.product_id}">☆</label>
                                <input type="radio" id="star1-${item.product_id}" name="rating-${item.product_id}" value="1"><label for="star1-${item.product_id}">☆</label>
                            </div>
                        </div>
                        <div class="review-form-group">
                            <label for="comment-${item.product_id}">Your Review</label>
                            <textarea id="comment-${item.product_id}" placeholder="Tell us what you thought..."></textarea>
                        </div>
                        <div class="review-form-group">
                            <label for="image-${item.product_id}">Add a photo (optional)</label>
                            <input type="file" id="image-${item.product_id}" accept="image/*">
                        </div>
                    </div>`;
            });
            reviewModalBody.innerHTML = reviewFormHtml + '</div>';
            submitReviewsBtn.dataset.orderId = orderId;
        } catch (err) {
            console.error('Failed to open review modal:', err);
            reviewModalBody.innerHTML = '<p>Could not load products for review.</p>';
        }
    }

    async function handleReviewSubmit() {
        const reviewItems = document.querySelectorAll('.review-product-item');
        const reviewPromises = [];
        for (const item of reviewItems) {
            const productId = item.dataset.productId;
            const ratingInput = item.querySelector('input[type="radio"]:checked');
            if (!ratingInput) continue;
            const rating = ratingInput.value;
            const comment = item.querySelector('textarea').value;
            const imageFile = item.querySelector('input[type="file"]').files[0];
            let imageUrl = null;
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                try {
                    const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', headers: getAuthHeaders(true), body: formData });
                    if (!uploadRes.ok) throw new Error('Image upload failed');
                    imageUrl = (await uploadRes.json()).filePath;
                } catch (err) { 
                    const reviewMessageEl = reviewModalBody.querySelector('.review-message');
                    if (reviewMessageEl) {
                        reviewMessageEl.textContent = 'Image upload failed. Please try again.';
                        reviewMessageEl.style.color = 'red';
                    }
                    return; 
                }
            }
            reviewPromises.push(fetch(`${API_URL}/reviews`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ product_id: productId, rating: parseInt(rating), comment, image_url: imageUrl }) }));
        }
        if (reviewPromises.length === 0) {
            const reviewMessageEl = reviewModalBody.querySelector('.review-message');
            if (reviewMessageEl) {
                reviewMessageEl.textContent = 'Please provide a rating for at least one product.';
                reviewMessageEl.style.color = 'red';
            }
            return;
        }
        try {
            await Promise.all(reviewPromises);
            closeModal(reviewModal);
            // Using a custom message element instead of alert
            const reviewMessageEl = document.getElementById('account-info-form-message');
            if (reviewMessageEl) {
                reviewMessageEl.textContent = 'Thank you! Your review(s) have been submitted.';
                reviewMessageEl.style.color = 'green';
                setTimeout(() => reviewMessageEl.textContent = '', 4000);
            }
        } catch (err) {
            console.error('Failed to submit reviews:', err);
            // Using a custom message element instead of alert
            const reviewMessageEl = reviewModalBody.querySelector('.review-message');
            if (reviewMessageEl) {
                reviewMessageEl.textContent = 'Error submitting reviews. Please try again.';
                reviewMessageEl.style.color = 'red';
            }
        }
    }

    // NEW: Function to handle contact form submission
    async function handleContactFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        // Reset message element before submission
        const contactMessageEl = document.getElementById('contact-form-message');
        contactMessageEl.textContent = '';
        contactMessageEl.style.color = '';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            const response = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMessage = result.message || 'Failed to send message due to an unknown server error.';
                throw new Error(errorMessage);
            }

            contactMessageEl.textContent = result.message || 'Message sent successfully!';
            contactMessageEl.style.color = 'green';
            contactForm.reset();
        } catch (error) {
            contactMessageEl.textContent = `Error: ${error.message}`;
            contactMessageEl.style.color = 'red';
            console.error('Contact form submission error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    }

    // NEW: Event listener for payment method change
    for (const radio of paymentOptions) {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'online') {
                onlinePaymentDetails.style.display = 'block';
                checkoutPayButton.textContent = 'Pay Now';
            } else {
                onlinePaymentDetails.style.display = 'none';
                checkoutPayButton.textContent = 'SAVE AND CONTINUE';
            }
        });
    }

    // NEW: Add a click listener for the new homepage category grid
    if (categoryShowcaseGrid) {
        categoryShowcaseGrid.addEventListener('click', (e) => {
            e.preventDefault();
            const categoryLink = e.target.closest('.category-item');
            if (categoryLink) {
                const category = categoryLink.dataset.category;
                const productsLink = document.querySelector('#main-nav a[href="#products"]');
                if (productsLink) {
                    showSection('products');
                    // This is a simple way to simulate a filter click.
                    // A more robust solution might involve updating the state directly.
                    const filterLink = document.querySelector(`ul#category-filter-list a[data-category="${category}"]`);
                    if (filterLink) {
                        const currentActive = categoryFilterList.querySelector('.active');
                        if (currentActive) {
                            currentActive.classList.remove('active');
                        }
                        filterLink.classList.add('active');
                        filterAndDisplayProducts();
                    }
                }
            }
        });
    }

    document.body.addEventListener('click', (e) => {
        const addToCartBtn = e.target.closest('.add-to-cart-btn');
        const card = e.target.closest('.product-card, .product-item-small');
        const viewOrderBtn = e.target.closest('.btn-view');
        const reviewOrderBtn = e.target.closest('.btn-review');
        if (addToCartBtn) { e.stopPropagation(); e.preventDefault(); handleAddToCart(addToCartBtn); } 
        else if (viewOrderBtn) { showOrderDetails(viewOrderBtn.dataset.orderId); }
        else if (reviewOrderBtn) { openReviewModal(reviewOrderBtn.dataset.orderId); }
        else if (card) { showProductDetails(parseInt(card.dataset.productId)); }
    });

    cartIcon.addEventListener('click', () => openModal(cartModal));
    cartItemsContainer.addEventListener('click', handleCartActions);
    checkoutBtn.addEventListener('click', openCheckoutPage); 
    
    checkoutAddressForm.addEventListener('submit', handlePaymentAndOrder);

    searchInput.addEventListener('input', filterAndDisplayProducts);
    logoutBtn.addEventListener('click', handleLogout);
    navLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); showSection(l.getAttribute('href').substring(1)); }));
    const handleFilterClick = (list, linkClass) => e => {
        e.preventDefault();
        const link = e.target.closest('a');
        if (link && link.classList.contains(linkClass)) {
            list.querySelector('.active').classList.remove('active');
            link.classList.add('active');
            filterAndDisplayProducts();
        }
    };
    categoryFilterList.addEventListener('click', handleFilterClick(categoryFilterList, 'category-link'));
    brandFilterList.addEventListener('click', handleFilterClick(brandFilterList, 'brand-link'));
    document.addEventListener('click', e => { if (e.target.classList.contains('close-button')) closeModal(document.getElementById(e.target.dataset.modal)); });
    window.addEventListener('click', e => { if (e.target.classList.contains('modal')) closeModal(e.target); });
    window.addEventListener('userLoggedIn', updateUserUI);
    userIconLink.addEventListener('click', e => { e.preventDefault(); showSection('account'); });
    accountInfoForm.addEventListener('submit', handleSaveAccountInfo);
    accountInfoForm.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditField));
    accountNavLinks.forEach(link => link.addEventListener('click', handleAccountNav));
    accountSignOutBtn.addEventListener('click', handleLogout);
    submitReviewsBtn.addEventListener('click', handleReviewSubmit);

    // NEW: Event listener for the contact form
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }

    fetchProducts();
    updateUserUI();
    updateCart();
    showSection(window.location.hash.substring(1) || 'home');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', prevSlide);
        nextBtn.addEventListener('click', nextSlide);
        setInterval(nextSlide, 5000); // Auto-scroll
        showSlide(slideIndex);
    }
});
