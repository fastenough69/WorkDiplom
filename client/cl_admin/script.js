// API Configuration
const API_BASE_URL = 'http://localhost:8001';
let isAdmin = false;

// Common functions
function checkAuth() {
    const token = getCookie('access-token');
    if (!token && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
    } else {
        alert(message);
    }
}

function handleLogout() {
    document.cookie = 'access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = 'index.html';
}

// Login functionality
function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/users/check?phone=${encodeURIComponent(phone)}&passwd=${encodeURIComponent(password)}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Check if user is admin
                        const userIdResponse = await fetch(`${API_BASE_URL}/users/get_id?phone=${encodeURIComponent(phone)}`);
                        const userIdData = await userIdResponse.json();
                        const userId = userIdData.id;
                        
                        const isAdminResponse = await fetch(`${API_BASE_URL}/users/is_admin?id=${userId}`);
                        const isAdminData = await isAdminResponse.json();
                        
                        if (isAdminData) {
                            window.location.href = 'admin.html';
                        } else {
                            showError('You are not an admin');
                        }
                    } else {
                        showError('Invalid credentials');
                    }
                } else {
                    showError('Login failed');
                }
            } catch (error) {
                showError('Network error: ' + error.message);
            }
        });
    }
}

// Users management
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/get_users`);
        const usersData = await response.json();
        
        // Преобразуем данные в нужный формат
        const users = usersData.map(item => ({
            id: item.row[0],
            phone: item.row[1],
            balance: item.row[2],
            admin: false // По умолчанию, так как в ваших данных нет информации об админских правах
        }));
        
        const tableBody = document.querySelector('#usersTable tbody');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.phone}</td>
                <td>${user.balance}</td>
                <td>${user.admin ? 'Yes' : 'No'}</td>
                <td>
                    <button class="btn edit-btn" data-id="${user.id}">Edit</button>
                    <button class="btn delete-btn" data-id="${user.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditUserModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users: ' + error.message);
    }
}
async function openEditUserModal(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/get_users`);
        const usersData = await response.json();
        
        // Находим нужного пользователя
        const userItem = usersData.find(item => item.row[0] == userId);
        
        if (userItem) {
            const user = {
                id: userItem.row[0],
                phone: userItem.row[1],
                balance: userItem.row[2],
                admin: false // По умолчанию
            };
            
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editPhone').value = user.phone;
            document.getElementById('editIsAdmin').value = user.admin;
            
            document.getElementById('editUserModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
        showError('Failed to load user data: ' + error.message);
    }
}
async function saveUserChanges() {
    const userId = document.getElementById('editUserId').value;
    const phone = document.getElementById('editPhone').value;
    const isAdmin = document.getElementById('editIsAdmin').value === 'true';
    
    // In a real app, you would send this to your API to update the user
    // For now, we'll just show a message
    alert(`User ${userId} updated with phone: ${phone}, admin: ${isAdmin}`);
    document.getElementById('editUserModal').style.display = 'none';
    loadUsers();
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        // In a real app, you would call your API to delete the user
        alert(`User ${userId} would be deleted here`);
        loadUsers();
    }
}

// Products management
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/market/get_data`);
        const products = await response.json();
        
        const tableBody = document.querySelector('#productsTable tbody');
        tableBody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.product_name}</td>
                <td>${product.description}</td>
                <td>${product.price}</td>
                <td>${product.cur_count_pos}</td>
                <td>
                    <button class="btn edit-product-btn" data-id="${product.id}">Edit</button>
                    <button class="btn delete-product-btn" data-id="${product.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditProductModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
        });
    } catch (error) {
        showError('Failed to load products: ' + error.message);
    }
}

function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productQuantity').value = '';
    
    document.getElementById('productModal').style.display = 'block';
}

async function openEditProductModal(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/market/get_data`);
        const products = await response.json();
        const product = products.find(p => p.id == productId);
        
        if (product) {
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.product_name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productQuantity').value = product.count_pos;
            
            document.getElementById('productModal').style.display = 'block';
        }
    } catch (error) {
        showError('Failed to load product data: ' + error.message);
    }
}

async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);
    
    try {
        if (productId) {
            // Update existing product
            // First update name, description, price if needed
            // Then update quantity separately
            await fetch(`${API_BASE_URL}/market/up_quanity?product_name=${encodeURIComponent(name)}&new_quianity=${quantity}`, {
                method: 'PUT'
            });
            
            alert('Product updated successfully');
        } else {
            // Add new product
            await fetch(`${API_BASE_URL}/market/insert?product_name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&count_pos=${quantity}&price=${price}`, {
                method: 'POST'
            });
            
            alert('Product added successfully');
        }
        
        document.getElementById('productModal').style.display = 'none';
        loadProducts();
    } catch (error) {
        showError('Failed to save product: ' + error.message);
    }
}

async function deleteProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/market/get_data`);
        const products = await response.json();
        const product = products.find(p => p.id == productId);
        
        if (product && confirm(`Are you sure you want to delete "${product.product_name}"?`)) {
            await fetch(`${API_BASE_URL}/market/del_pos?product_name=${encodeURIComponent(product.product_name)}`, {
                method: 'DELETE'
            });
            
            loadProducts();
        }
    } catch (error) {
        showError('Failed to delete product: ' + error.message);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupLogin();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Users page
    if (document.getElementById('usersTable')) {
        loadUsers();
        
        document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);
        
        document.getElementById('editUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserChanges();
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('editUserModal').style.display = 'none';
        });
    }
    
    // Market page
    if (document.getElementById('productsTable')) {
        loadProducts();
        
        document.getElementById('refreshProductsBtn').addEventListener('click', loadProducts);
        document.getElementById('addProductBtn').addEventListener('click', openAddProductModal);
        
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            saveProduct();
        });
        
        document.querySelectorAll('.close')[0].addEventListener('click', () => {
            document.getElementById('productModal').style.display = 'none';
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.className === 'modal') {
            event.target.style.display = 'none';
        }
    });
});
