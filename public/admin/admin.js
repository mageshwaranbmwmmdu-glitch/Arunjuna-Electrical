// admin/admin.js

// --- Security Check & Auth Helper ---
const getAdminAuthHeaders = (isFormData = false) => {
    const token = localStorage.getItem('admin-token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        if (decodedToken.role !== 'admin' || (decodedToken.exp * 1000) < Date.now()) {
            localStorage.removeItem('admin-token');
            window.location.href = 'login.html';
        }
    } catch (e) {
        localStorage.removeItem('admin-token');
        window.location.href = 'login.html';
    }
})();


document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const productForm = document.getElementById('product-form');
    const formTitle = document.getElementById('form-title');
    const productsTableBody = document.getElementById('products-table-body');
    const ordersTableBody = document.getElementById('orders-table-body');
    const reviewsTableBody = document.getElementById('reviews-table-body');
    const orderAddressTableBody = document.getElementById('order-address-table-body'); // New Element
    const productIdInput = document.getElementById('product-id');
    const imageUrlInput = document.getElementById('image_url');
    const imageFileInput = document.getElementById('image');
    
    const productModal = document.getElementById('product-modal');
    const orderDetailsModalAdmin = document.getElementById('order-details-modal-admin');
    const orderDetailsBodyAdmin = document.getElementById('order-details-body-admin');
    const addProductBtn = document.getElementById('add-product-btn');
    const closeModalBtns = document.querySelectorAll('.close-button');
    const logoutBtn = document.getElementById('logout-btn');
    const dashboardDownloadBtn = document.getElementById('download-dashboard-pdf');
    const productsDownloadBtn = document.getElementById('download-products-pdf');
    const ordersDownloadBtn = document.getElementById('download-orders-pdf');

    const totalRevenueEl = document.getElementById('total-revenue');
    const totalOrdersEl = document.getElementById('total-orders');
    const totalProductsEl = document.getElementById('total-products');

    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const mainHeaderTitle = document.querySelector('.main-header h2');
    const sections = {
        dashboard: document.getElementById('dashboard'),
        products: document.getElementById('products'),
        orders: document.getElementById('orders'),
        reviews: document.getElementById('reviews'),
        'order-address': document.getElementById('order-address') // New Section
    };
    const orderFiltersContainer = document.querySelector('.order-filters');

    const API_URL = 'http://localhost:3000/api';
    let isEditing = false;
    let allProductsCache = [];
    let allOrdersCache = [];

    // --- Modal Functions ---
    const openModal = (modal) => { if(modal) modal.style.display = 'flex'; };
    const closeModal = (modal) => { if(modal) modal.style.display = 'none'; };
    const showMessage = (message) => alert(message);

    // --- PDF Download Function ---
    async function downloadPdf(endpoint) {
        const token = localStorage.getItem('admin-token');
        if (!token) {
            showMessage("Authorization token not found. Please log in again.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${endpoint}?token=${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                const errorData = await response.json();
                showMessage(`Download failed: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Download error:', error);
            showMessage('Download failed: Failed to generate PDF report.');
        }
    }

    // --- Page Navigation ---
    function showSection(targetId) {
        Object.values(sections).forEach(s => { if(s) s.style.display = 'none'; });
        
        if (targetId === 'dashboard') {
            if (sections.dashboard) sections.dashboard.style.display = 'grid';
            if (sections.products) sections.products.style.display = 'block';
            if (sections.orders) sections.orders.style.display = 'block';
            if (mainHeaderTitle) mainHeaderTitle.textContent = 'Dashboard Overview';
        } else if (sections[targetId]) {
            sections[targetId].style.display = 'block';
            if (mainHeaderTitle) mainHeaderTitle.textContent = `${targetId.charAt(0).toUpperCase() + targetId.slice(1)} Management`;
        }

        sidebarLinks.forEach(link => {
            link.parentElement.classList.toggle('active', link.getAttribute('href') === `#${targetId}`);
        });
    }

    // --- Data Fetching and Display ---
    async function fetchAllData() {
        await Promise.all([
            fetchAndDisplayProducts(),
            fetchAndDisplayOrders(),
            fetchAndDisplayReviews(),
            fetchAndDisplayOrderAddresses() // New fetch function
        ]);
        showSection('dashboard');
    }

    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch(`${API_URL}/products`);
            allProductsCache = await response.json();
            if (productsTableBody) {
                productsTableBody.innerHTML = allProductsCache.map(p => {
                    const price = (p.price !== null && !isNaN(p.price)) 
                        ? `Rs. ${parseFloat(p.price).toFixed(2)}` 
                        : 'N/A';
                    return `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.name || 'No Name'}</td>
                            <td>${p.brand || 'N/A'}</td>
                            <td>${price}</td>
                            <td>${p.stock}</td>
                            <td>
                                <button class="action-btn edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                                <button class="action-btn download-product-pdf-btn" data-id="${p.id}" data-endpoint="products/${p.id}/pdf"><i class="fas fa-download"></i></button>
                            </td>
                        </tr>`;
                }).join('');
            }
            if (totalProductsEl) totalProductsEl.textContent = allProductsCache.length;
        } catch (error) { 
            console.error('Failed to fetch products:', error); 
            if (productsTableBody) productsTableBody.innerHTML = '<tr><td colspan="6">Error loading products.</td></tr>';
        }
    }

    async function fetchAndDisplayOrders() {
        try {
            const response = await fetch(`${API_URL}/orders`, { headers: getAdminAuthHeaders() });
            allOrdersCache = await response.json();
            displayFilteredOrders('All');
            if (totalOrdersEl) totalOrdersEl.textContent = allOrdersCache.length;
            const totalRevenue = allOrdersCache.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
            if (totalRevenueEl) totalRevenueEl.textContent = `Rs. ${totalRevenue.toFixed(2)}`;
        } catch (error) { console.error('Failed to fetch orders:', error); }
    }
    
    function displayFilteredOrders(status) {
        if (!ordersTableBody) return;
        const filtered = status === 'All' ? allOrdersCache : allOrdersCache.filter(o => o.status === status);
        ordersTableBody.innerHTML = filtered.map(o => `
            <tr>
                <td>#${o.order_id}</td>
                <td>${o.username}</td>
                <td>${o.products}</td>
                <td>Rs. ${parseFloat(o.total_amount).toFixed(2)}</td>
                <td>${o.payment_method.toUpperCase()}</td>
                <td>
                    <select class="status-select" data-order-id="${o.order_id}">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="btn-view" data-order-id="${o.order_id}">View</button>
                    <button class="action-btn download-order-pdf-btn" data-id="${o.order_id}" data-endpoint="orders/${o.order_id}/pdf"><i class="fas fa-download"></i></button>
                </td>
            </tr>`
        ).join('');
        if (filtered.length === 0) ordersTableBody.innerHTML = '<tr><td colspan="7">No orders found.</td></tr>';
    }

    async function fetchAndDisplayReviews() {
        try {
            const response = await fetch(`${API_URL}/reviews`, { headers: getAdminAuthHeaders() });
            const reviews = await response.json();
            if (reviewsTableBody) {
                reviewsTableBody.innerHTML = reviews.map(r => `
                    <tr><td>${r.product_name}</td><td>${r.username}</td><td>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
                    <td class="comment-cell" title="${r.comment}">${r.comment}</td><td>${new Date(r.created_at).toLocaleDateString()}</td></tr>`
                ).join('');
            }
        } catch (error) { console.error('Failed to fetch reviews:', error); }
    }

    // New function to fetch and display order addresses
    async function fetchAndDisplayOrderAddresses() {
        try {
            const response = await fetch(`${API_URL}/orders/address`, { headers: getAdminAuthHeaders() });
            const addresses = await response.json();
            if (orderAddressTableBody) {
                orderAddressTableBody.innerHTML = addresses.map(a => `
                    <tr>
                        <td>#${a.order_id}</td>
                        <td>${a.full_name}</td>
                        <td>${a.mobile_number}</td>
                        <td>${a.email}</td>
                        <td>${a.address_line_1}, ${a.address_line_2 ? a.address_line_2 + ', ' : ''}${a.city}, ${a.postal_code}, ${a.country}</td>
                    </tr>`
                ).join('');
            }
        } catch (error) {
            console.error('Failed to fetch order addresses:', error);
            if (orderAddressTableBody) orderAddressTableBody.innerHTML = '<tr><td colspan="5">Error loading order addresses.</td></tr>';
        }
    }

    async function showAdminOrderDetails(orderId) {
        if (!orderDetailsBodyAdmin || !orderDetailsModalAdmin) return;
        orderDetailsBodyAdmin.innerHTML = '<p>Loading...</p>';
        openModal(orderDetailsModalAdmin);
        try {
            const res = await fetch(`${API_URL}/orders/details/${orderId}`, { headers: getAdminAuthHeaders() });
            if (!res.ok) throw new Error('Could not fetch order details.');
            const items = await res.json();
            orderDetailsBodyAdmin.innerHTML = `<div class="order-details-list">${items.map(i => `
                <div class="order-details-item"><div class="order-item-image"><img src="../${i.image_url||'https://placehold.co/100x100/EEE/31343C?text=No+Image'}" alt="${i.name}"></div>
                <div class="order-item-info"><h4>${i.name}</h4><p>Quantity: ${i.quantity}</p><p>Price: Rs. ${parseFloat(i.price).toFixed(2)}</p></div></div>`
            ).join('')}</div>`;
        } catch (err) {
            console.error('Failed to show order details:', err);
            orderDetailsBodyAdmin.innerHTML = '<p>Could not load details.</p>';
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        let imageUrl = document.getElementById('image_url').value;
        const imageFile = document.getElementById('image').files[0];
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            try {
                const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: getAdminAuthHeaders(true), body: formData });
                if (!res.ok) throw new Error('Image upload failed');
                imageUrl = (await res.json()).filePath;
            } catch (err) { showMessage('Image upload failed.'); return; }
        }
        const productData = {
            name: document.getElementById('name').value, brand: document.getElementById('brand').value, description: document.getElementById('description').value,
            price: parseFloat(document.getElementById('price').value), stock: parseInt(document.getElementById('stock').value, 10), image_url: imageUrl,
        };
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/products/${document.getElementById('product-id').value}` : `${API_URL}/products`;
        try {
            const res = await fetch(url, { method, headers: getAdminAuthHeaders(), body: JSON.stringify(productData) });
            if (!res.ok) throw new Error('Failed to save product.');
            closeModal(productModal);
            await fetchAndDisplayProducts();
        } catch (err) { showMessage(err.message); }
    }

    function resetForm() {
        if (productForm) {
            productForm.reset();
            isEditing = false;
            document.getElementById('form-title').textContent = 'Add New Product';
            document.getElementById('product-id').value = '';
        }
    }

    function populateFormForEdit(product) {
        resetForm();
        isEditing = true;
        document.getElementById('form-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('brand').value = product.brand;
        document.getElementById('description').value = product.description;
        document.getElementById('price').value = product.price;
        document.getElementById('stock').value = product.stock;
        document.getElementById('image_url').value = product.image_url;
        openModal(productModal);
    }

    if (productForm) productForm.addEventListener('submit', handleFormSubmit);
    if (productsTableBody) productsTableBody.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('edit-btn')) {
            const product = allProductsCache.find(p => p.id == id);
            if (product) populateFormForEdit(product);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure?')) {
                fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getAdminAuthHeaders() })
                    .then(res => res.ok ? fetchAndDisplayProducts() : showMessage('Failed to delete.'))
                    .catch(err => showMessage('Error deleting product.'));
            }
        } else if (target.classList.contains('download-product-pdf-btn')) {
            downloadPdf(`products/${id}/pdf`);
        }
    });
    if (ordersTableBody) {
        ordersTableBody.addEventListener('change', async e => {
            if (e.target.classList.contains('status-select')) {
                const orderId = e.target.dataset.orderId;
                const newStatus = e.target.value;
                try {
                    const res = await fetch(`${API_URL}/orders/${orderId}/status`, { method: 'PUT', headers: getAdminAuthHeaders(), body: JSON.stringify({ status: newStatus }) });
                    if (!res.ok) throw new Error('Failed to update status.');
                    await fetchAndDisplayOrders();
                } catch (err) { showMessage('Failed to update status.'); }
            }
        });
        ordersTableBody.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (target && target.classList.contains('btn-view')) {
                showAdminOrderDetails(target.dataset.orderId);
            } else if (target && target.classList.contains('download-order-pdf-btn')) {
                downloadPdf(`orders/${target.dataset.id}/pdf`);
            }
        });
    }
    if (addProductBtn) addProductBtn.addEventListener('click', () => { resetForm(); openModal(productModal); });
    if (closeModalBtns) {
        closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal'))));
    }
    if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin-token'); window.location.href = 'login.html'; });
    if (orderFiltersContainer) orderFiltersContainer.addEventListener('click', e => {
        if (e.target.classList.contains('filter-btn')) {
            const currentActive = orderFiltersContainer.querySelector('.active');
            if (currentActive) currentActive.classList.remove('active');
            e.target.classList.add('active');
            displayFilteredOrders(e.target.dataset.status);
        }
    });
    if (dashboardDownloadBtn) {
        dashboardDownloadBtn.addEventListener('click', () => downloadPdf('dashboard/pdf'));
    }
    if (productsDownloadBtn) {
        productsDownloadBtn.addEventListener('click', () => downloadPdf('products/pdf'));
    }
    if (ordersDownloadBtn) {
        ordersDownloadBtn.addEventListener('click', () => downloadPdf('orders/pdf'));
    }

    window.addEventListener('click', e => {
        if (e.target === productModal) closeModal(productModal);
        if (e.target === orderDetailsModalAdmin) closeModal(orderDetailsModalAdmin);
    });
    sidebarLinks.forEach(link => {
        if (link.id !== 'logout-btn' && !link.getAttribute('target')) {
            link.addEventListener('click', e => {
                e.preventDefault();
                showSection(link.getAttribute('href').substring(1));
            });
        }
    });

    fetchAllData();
});
