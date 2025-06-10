// API Configuration
const API_BASE_URL = 'http://localhost:8001';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2RkZGRkZCIgZD0iTTE5IDVIMTVWM0g5djJINVYyMWgxOVY1TTE5IDE5VjVIMjFWMjFIMTlNMTkgMTcuNjVIMThWMTlIMTdWMTcuNjVIMTdWMTYuNUgxNy41VjE1SDE4LjVWMTYuNUgxOVYxNy42NU0xMyAxOUgxMVYxN0gxM3YyTTEzIDE1SDExVjEzSDEzdjJNMTMgMTFIMTFWOUgxM3YyTTE3IDE1SDE1VjEzSDE3djJNMTcgMTFIMTVWOkgxN3YyTTkgMTVIN1YxM0g5djJNOSAxMUg3VjlIOXYyTTkgMTlIN1YxN0g5djJNNSAxNUgzdjJoMnYtMk01IDExSDNWOWgydjJNNSAxOUgzdjJoMnYtMk0xOSAxMkgyMFYxNEgxOXYtMk0xOSA4SDIwVjEwSDE5VjhaIi8+PC9zdmc+';

let productSort = {
  column: null,
  direction: 'asc'
};

let usersSort = {
  column: 'id',
  direction: 'asc'
};

let ordersSort = {
  column: 'date',
  direction: 'desc'
};

function checkAuth() {
  const token = getCookie('access-token');
  const isLoginPage = window.location.pathname.endsWith('index.html') || 
    window.location.pathname.endsWith('/');

  if (!token && !isLoginPage) {
    window.location.href = 'index.html';
  }
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
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

function setupLogin() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const loginInput = document.getElementById('login');
      const passwordInput = document.getElementById('password');

      if (!loginInput || !passwordInput) {
        showError('Login form elements not found');
        return;
      }

      const login = loginInput.value;
      const password = passwordInput.value;

      try {
        const response = await fetch(`${API_BASE_URL}/admins/check_user?login=${encodeURIComponent(login)}&passwd=${encodeURIComponent(password)}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            window.location.href = 'admin.html';
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

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/get_users`);
    if (!response.ok) throw new Error('Failed to fetch users');

    const data = await response.json();

    const usersData = data.map(item => ({
      id: item.row[0],
      phone: item.row[1],
    }));

    usersData.sort((a, b) => {
      let valA, valB;
      
      if (usersSort.column === 'id') {
        valA = parseInt(a.id);
        valB = parseInt(b.id);
      } else {
        valA = a[usersSort.column];
        valB = b[usersSort.column];
      }

      if (valA < valB) return usersSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return usersSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const tableBody = document.querySelector('#usersTable tbody');
    if (!tableBody) {
      console.error('Table body not found');
      return;
    }

    tableBody.innerHTML = '';

    usersData.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.phone}</td>
        <td>
          <button class="btn edit-btn" data-id="${user.id}">Edit</button>
          <button class="btn delete-btn" data-id="${user.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    updateUsersSortIndicators();

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

function updateUsersSortIndicators() {
  document.querySelectorAll('#usersTable th.sortable').forEach(th => {
    const originalText = th.getAttribute('data-original-text') || th.textContent.trim();
    th.innerHTML = originalText;

    if (th.dataset.sort === usersSort.column) {
      th.innerHTML += usersSort.direction === 'asc' ? ' ↑' : ' ↓';
    }
  });
}

async function searchUsersByPhone() {
  const searchInput = document.getElementById('searchPhone');
  const searchBtn = document.getElementById('searchBtn');
  
  if (!searchInput || !searchBtn) return;

  const searchTerm = searchInput.value.trim();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Поиск...';

  try {
    const response = await fetch(`${API_BASE_URL}/users/get_users`);
    if (!response.ok) throw new Error('Failed to fetch users');

    const data = await response.json();
    let filteredUsers = data
      .filter(item => item.row[1].includes(searchTerm))
      .map(item => ({
        id: item.row[0],
        phone: item.row[1],
      }));

    filteredUsers.sort((a, b) => {
      let valA, valB;
      
      if (usersSort.column === 'id') {
        valA = parseInt(a.id);
        valB = parseInt(b.id);
      } else {
        valA = a[usersSort.column];
        valB = b[usersSort.column];
      }

      if (valA < valB) return usersSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return usersSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const tableBody = document.querySelector('#usersTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    filteredUsers.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.phone}</td>
        <td>
          <button class="btn edit-btn" data-id="${user.id}">Edit</button>
          <button class="btn delete-btn" data-id="${user.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    updateUsersSortIndicators();

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditUserModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });

  } catch (error) {
    console.error('Search failed:', error);
    showError('Ошибка поиска: ' + error.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Найти';
  }
}

async function openEditUserModal(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/get_user?userId=${userId}`);
    if (!response.ok) throw new Error('Не удалось получить данные пользователя');

    const data = await response.json();
    console.log(data)

    let phone;
    if (Array.isArray(data.row)) {
      phone = data.row[1];
    } else {
      throw new Error('Неверный формат данных пользователя');
    }

    document.getElementById('editUserId').value = userId;
    document.getElementById('editPhone').value = phone;

    document.getElementById('editUserModal').style.display = 'block';
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    showError('Ошибка загрузки: ' + error.message);
  }
}

async function saveUserChanges() {
  const userId = document.getElementById('editUserId').value;
  const phone = document.getElementById('editPhone').value;

  try {
    const response = await fetch(`${API_BASE_URL}/users/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        phone: phone,
      })
    });

    if (!response.ok) throw new Error('Failed to update user');

    document.getElementById('editUserModal').style.display = 'none';
    loadUsers();
  } catch (error) {
    showError('Failed to save changes: ' + error.message);
  }
}

async function deleteUser(userId) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/delete?userId=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete user');

      loadUsers();
    } catch (error) {
      showError('Failed to delete user: ' + error.message);
    }
  }
}

async function getProductImageUrl(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/market/get/picture?productId=${productId}`);
    if (response.ok) {
      return `${API_BASE_URL}/market/get/picture?productId=${productId}`;
    }
    return PLACEHOLDER_IMAGE;
  } catch (error) {
    console.error('Error checking product image:', error);
    return PLACEHOLDER_IMAGE;
  }
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/market/get_data`);
    if (!response.ok) throw new Error('Failed to fetch products');
    
    const data = await response.json();
    console.log('API Response:', data); // Для отладки
    
    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data.rows) {
      products = data.rows;
    } else if (data.products) {
      products = data.products;
    } else {
      throw new Error('Unexpected API response format');
    }

    if (products.length === 0) {
      console.warn('No products received from API');
      return;
    }

    if (productSort.column) {
      products.sort((a, b) => {
        const aValue = a[productSort.column] || 
                      (productSort.column === 'product_name' ? a.name : 
                       productSort.column === 'cur_count_pos' ? a.quantity : null);
        const bValue = b[productSort.column] || 
                      (productSort.column === 'product_name' ? b.name : 
                       productSort.column === 'cur_count_pos' ? b.quantity : null);
        
        if (aValue < bValue) return productSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return productSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const tableBody = document.querySelector('#productsTable tbody');
    if (!tableBody) {
      console.error('Table body not found');
      return;
    }
    
    tableBody.innerHTML = '';

    for (const product of products) {
      const imageUrl = await getProductImageUrl(product.id);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.id}</td>
        <td>
          <div class="product-with-image">
            <img src="${imageUrl}" alt="${product.product_name || product.name || 'No name'}" 
                 onerror="this.src='${PLACEHOLDER_IMAGE}'">
            ${product.product_name || product.name || 'No name'}
          </div>
        </td>
        <td>${product.description || ''}</td>
        <td>${product.price || 0}</td>
        <td>${product.cur_count_pos || product.quantity || 0}</td>
        <td>
          <button class="btn edit-btn" data-id="${product.id}">Edit</button>
          <button class="btn delete-btn" data-id="${product.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    }

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditProductModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });

    updateProductSortIndicators();
  } catch (error) {
    console.error('Failed to load products:', error);
    showError('Failed to load products: ' + error.message);
  }
}

async function searchProductsByName() {
  const searchInput = document.getElementById('searchProduct');
  const searchBtn = document.getElementById('searchProductBtn');

  if (!searchInput || !searchBtn) return;

  const searchTerm = searchInput.value.trim().toLowerCase();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  try {
    const response = await fetch(`${API_BASE_URL}/market/get_data`);
    if (!response.ok) throw new Error('Failed to fetch products');

    const data = await response.json();

    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data.rows) {
      products = data.rows;
    } else if (data.products) {
      products = data.products;
    } else {
      throw new Error('Unexpected API response format');
    }

    const filteredProducts = products.filter(product => {
      const productName = (product.product_name || product.name || '').toLowerCase();
      return productName.includes(searchTerm);
    });

    if (productSort.column) {
      filteredProducts.sort((a, b) => {
        const aValue = a[productSort.column] ||
                      (productSort.column === 'product_name' ? a.name :
                       productSort.column === 'cur_count_pos' ? a.quantity : null);
        const bValue = b[productSort.column] ||
                      (productSort.column === 'product_name' ? b.name :
                       productSort.column === 'cur_count_pos' ? b.quantity : null);

        if (aValue < bValue) return productSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return productSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const tableBody = document.querySelector('#productsTable tbody');
    if (!tableBody) {
      console.error('Table body not found');
      return;
    }

    tableBody.innerHTML = '';

    for (const product of filteredProducts) {
      const imageUrl = await getProductImageUrl(product.id);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.id}</td>
        <td>
          <div class="product-with-image">
            <img src="${imageUrl}" alt="${product.product_name || product.name || 'No name'}"
                 onerror="this.src='${PLACEHOLDER_IMAGE}'">
            ${product.product_name || product.name || 'No name'}
          </div>
        </td>
        <td>${product.description || ''}</td>
        <td>${product.price || 0}</td>
        <td>${product.cur_count_pos || product.quantity || 0}</td>
        <td>
          <button class="btn edit-btn" data-id="${product.id}">Edit</button>
          <button class="btn delete-btn" data-id="${product.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    }

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditProductModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });

    updateProductSortIndicators();
  } catch (error) {
    console.error('Search failed:', error);
    showError('Search error: ' + error.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}


function updateProductSortIndicators() {
  document.querySelectorAll('#productsTable th.sortable').forEach(th => {
    const originalText = th.getAttribute('data-original-text') || th.textContent.trim();
    th.innerHTML = originalText;

    if (th.dataset.sort === productSort.column) {
      th.innerHTML += productSort.direction === 'asc' ? ' ↑' : ' ↓';
    }
  });
}

function openAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productQuantity').value = '';
  document.getElementById('productImage').value = '';
  document.getElementById('productModal').style.display = 'block';
}

async function openEditProductModal(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/market/get_product?productId=${productId}`);
    if (!response.ok) throw new Error('Failed to fetch product data');

    const data = await response.json();

    if (!data.row || !Array.isArray(data.row)) {
      throw new Error('Invalid product data format: expected array "row"');
    }

    const productData = data.row;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = productData[0] || '';
    document.getElementById('productName').value = productData[1] || '';
    document.getElementById('productDescription').value = productData[2] || '';
    document.getElementById('productPrice').value = productData[3] || 0;
    document.getElementById('productQuantity').value = productData[4] || 0;
    document.getElementById('productImage').value = '';

    document.getElementById('productModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading product data:', error);
    showError('Failed to load product data: ' + error.message);
  }
}

async function saveProduct() {
  const productId = document.getElementById('productId').value;
  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const quantity = parseInt(document.getElementById('productQuantity').value);
  const imageFile = document.getElementById('productImage').files[0];

  try {
    if (productId) {
      const updateResponse = await fetch(`${API_BASE_URL}/market/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(productId),
          product_name: name,
          description: description,
          price: price,
          cur_count_pos: quantity
        })
      });

      const updateResult = await updateResponse.json();
      if (!updateResult.status) throw new Error('Ошибка при обновлении товара');

      if (imageFile) {
        await uploadProductImage(productId, imageFile);
      }
    } else {
      const url = new URL(`${API_BASE_URL}/market/insert`);
      url.searchParams.append('product_name', name);
      url.searchParams.append('description', description);
      url.searchParams.append('count_pos', quantity);
      url.searchParams.append('price', price);

      const insertResponse = await fetch(url, {
        method: 'POST'
      });

      const insertResult = await insertResponse.json();
      if (insertResult.status !== "ok") throw new Error('Ошибка при добавлении товара');

      if (imageFile) {
        const newProductId = insertResult.id || await getProductIdByName(name);
        if (newProductId) {
          await uploadProductImage(newProductId, imageFile);
        }
      }
    }

    document.getElementById('productModal').style.display = 'none';
    loadProducts();
  } catch (error) {
    showError('Ошибка при сохранении товара: ' + error.message);
  }
}

async function uploadProductImage(productId, imageFile) {
  const formData = new FormData();
  formData.append('up_file', imageFile);

  try {
    const response = await fetch(`${API_BASE_URL}/market/insert/picture?productId=${productId}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Ошибка загрузки изображения');

    return true;
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    throw error;
  }
}

async function getProductIdByName(productName) {
  try {
    const response = await fetch(`${API_BASE_URL}/market/get_data`);
    if (!response.ok) throw new Error('Ошибка загрузки товаров');
    const products = await response.json();
    const product = products.find(p => p.product_name === productName);
    return product ? product.id : null;
  } catch (error) {
    console.error('Ошибка поиска товара:', error);
    return null;
  }
}

async function deleteProduct(productId) {
  try {
    const productResponse = await fetch(`${API_BASE_URL}/market/get_product?productId=${productId}`);
    if (!productResponse.ok) throw new Error('Ошибка при получении данных товара');

    const productData = await productResponse.json();

    if (!productData.row || !Array.isArray(productData.row) || productData.row.length < 2) {
      throw new Error('Неверный формат данных товара');
    }

    const productName = productData.row[1];

    if (confirm(`Вы уверены, что хотите удалить "${productName}"?`)) {
      const deleteResponse = await fetch(
        `${API_BASE_URL}/market/del_pos?product_name=${encodeURIComponent(productName)}`, 
        {
          method: 'DELETE'
        }
      );

      const deleteResult = await deleteResponse.json();
      if (deleteResult.status !== "ok") throw new Error('Ошибка при удалении товара');

      loadProducts();
    }
  } catch (error) {
    showError('Ошибка при удалении товара: ' + error.message);
  }
}

async function loadOrders() {
  try {
    const ordersResponse = await fetch(`${API_BASE_URL}/orders/get_data`);
    if (!ordersResponse.ok) throw new Error('Не удалось загрузить заказы');
    let orders = await ordersResponse.json();

    orders.sort((a, b) => {
      let valueA, valueB;

      if (ordersSort.column === 'date') {
        valueA = new Date(a.date_orders).getTime();
        valueB = new Date(b.date_orders).getTime();
      } else if (ordersSort.column === 'total_price') {
        valueA = a.total_price;
        valueB = b.total_price;
      }

      if (valueA < valueB) {
        return ordersSort.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return ordersSort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    const tableBody = document.querySelector('#ordersTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    for (const order of orders) {
      try {
        const userResponse = await fetch(`${API_BASE_URL}/users/get_user?userId=${order.userid}`);
        const userData = await userResponse.json();
        const userPhone = userData.row ? userData.row[1] : 'Неизвестно';

        let productNames = [];
        if (Array.isArray(order.productids)) {
          const productRequests = order.productids.map(productId => 
            fetch(`${API_BASE_URL}/market/get_product?productId=${productId}`)
          );

          const productResponses = await Promise.all(productRequests);
          const productData = await Promise.all(productResponses.map(r => r.json()));

          productNames = productData.map(p => p.row ? p.row[1] : `Товар (ID: ${productId})`);
        } else {
          productNames = ['Нет данных о товарах'];
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${order.id}</td>
          <td>${userPhone}</td>
          <td>${productNames.join(', ')}</td>
          <td>${order.total_price.toFixed(2)}</td>
          <td>${order.status}</td>
          <td>${new Date(order.date_orders).toLocaleString()}</td>
        `;
        tableBody.appendChild(row);
      } catch (error) {
        console.error(`Ошибка обработки заказа ${order.id}:`, error);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${order.id}</td>
          <td>Ошибка загрузки</td>
          <td>Ошибка загрузки</td>
          <td>${order.total_price?.toFixed(2) || 'N/A'}</td>
          <td>${order.status || 'N/A'}</td>
          <td>${order.date_orders ? new Date(order.date_orders).toLocaleString() : 'N/A'}</td>
        `;
        tableBody.appendChild(row);
      }
    }

    updateOrdersSortIndicators();
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    showError('Ошибка загрузки заказов: ' + error.message);
  }
}

async function searchOrdersByPhone() {
  const searchInput = document.getElementById('searchPhone');
  const searchBtn = document.getElementById('searchBtn');

  if (!searchInput || !searchBtn) return;

  const searchTerm = searchInput.value.trim();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  try {
    const response = await fetch(`${API_BASE_URL}/orders/get_data`);
    if (!response.ok) throw new Error('Failed to fetch orders');

    const orders = await response.json();
    let filteredOrders = [];

    for (const order of orders) {
      try {
        const userResponse = await fetch(`${API_BASE_URL}/users/get_user?userId=${order.userid}`);
        const userData = await userResponse.json();
        const userPhone = userData.row ? userData.row[1] : '';

        if (userPhone.includes(searchTerm)) {
          filteredOrders.push(order);
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
      }
    }

    filteredOrders.sort((a, b) => {
      let valueA, valueB;

      if (ordersSort.column === 'date') {
        valueA = new Date(a.date_orders).getTime();
        valueB = new Date(b.date_orders).getTime();
      } else if (ordersSort.column === 'total_price') {
        valueA = a.total_price;
        valueB = b.total_price;
      } else if (ordersSort.column === 'id') {
        valueA = a.id;
        valueB = b.id;
      }

      if (valueA < valueB) {
        return ordersSort.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return ordersSort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    const tableBody = document.querySelector('#ordersTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    for (const order of filteredOrders) {
      try {
        const userResponse = await fetch(`${API_BASE_URL}/users/get_user?userId=${order.userid}`);
        const userData = await userResponse.json();
        const userPhone = userData.row ? userData.row[1] : 'Unknown';

        let productNames = [];
        if (Array.isArray(order.productids)) {
          const productRequests = order.productids.map(productId =>
            fetch(`${API_BASE_URL}/market/get_product?productId=${productId}`)
          );

          const productResponses = await Promise.all(productRequests);
          const productData = await Promise.all(productResponses.map(r => r.json()));

          productNames = productData.map(p => p.row ? p.row[1] : `Product (ID: ${productId})`);
        } else {
          productNames = ['No product data'];
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${order.id}</td>
          <td>${userPhone}</td>
          <td>${productNames.join(', ')}</td>
          <td>${order.total_price.toFixed(2)}</td>
          <td>${order.status}</td>
          <td>${new Date(order.date_orders).toLocaleString()}</td>
        `;
        tableBody.appendChild(row);
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${order.id}</td>
          <td>Load error</td>
          <td>Load error</td>
          <td>${order.total_price?.toFixed(2) || 'N/A'}</td>
          <td>${order.status || 'N/A'}</td>
          <td>${order.date_orders ? new Date(order.date_orders).toLocaleString() : 'N/A'}</td>
        `;
        tableBody.appendChild(row);
      }
    }

    updateOrdersSortIndicators();
  } catch (error) {
    console.error('Search error:', error);
    showError('Search error: ' + error.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}

function updateOrdersSortIndicators() {
  document.querySelectorAll('#ordersTable th.sortable').forEach(th => {
    const originalText = th.getAttribute('data-original-text') || th.textContent.trim();
    th.innerHTML = originalText;

    if (th.dataset.sort === ordersSort.column) {
      th.innerHTML += ordersSort.direction === 'asc' ? ' ↑' : ' ↓';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  if (document.getElementById('loginForm')) {
    setupLogin();
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (document.getElementById('usersTable')) {
    loadUsers();

    const refreshBtn = document.getElementById('refreshUsersBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadUsers);

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', searchUsersByPhone);

    const searchInput = document.getElementById('searchPhone');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          searchUsersByPhone();
        }
      });
    }

    const editForm = document.getElementById('editUserForm');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveUserChanges();
      });
    }

    const editModal = document.getElementById('editUserModal');
    if (editModal) {
      const closeBtn = editModal.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          editModal.style.display = 'none';
        });
      }
    }

    document.querySelectorAll('#usersTable th.sortable').forEach(th => {
      if (!th.getAttribute('data-original-text')) {
        th.setAttribute('data-original-text', th.textContent.trim());
      }

      th.addEventListener('click', () => {
        const column = th.dataset.sort;

        if (usersSort.column === column) {
          usersSort.direction = usersSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          usersSort.column = column;
          usersSort.direction = 'asc';
        }

        loadUsers();
      });
    });
  }

if (document.getElementById('ordersTable')) {
  loadOrders();

  const refreshBtn = document.getElementById('refreshOrdersBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadOrders();
    });
  }

  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchOrdersByPhone);
  }

  const searchInput = document.getElementById('searchPhone');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchOrdersByPhone();
      }
    });
  }

  document.querySelectorAll('#ordersTable th.sortable').forEach(th => {
    if (!th.getAttribute('data-original-text')) {
      th.setAttribute('data-original-text', th.textContent.trim());
    }

    th.addEventListener('click', () => {
      const column = th.dataset.sort;

      if (ordersSort.column === column) {
        ordersSort.direction = ordersSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        ordersSort.column = column;
        ordersSort.direction = 'asc';
      }

      if (document.getElementById('searchPhone').value.trim()) {
        searchOrdersByPhone();
      } else {
        loadOrders();
      }
    });
  });
}

if (document.getElementById('productsTable')) {
  loadProducts();

  document.getElementById('addProductBtn')?.addEventListener('click', openAddProductModal);
  document.getElementById('refreshProductsBtn')?.addEventListener('click', loadProducts);
  document.getElementById('searchProductBtn')?.addEventListener('click', searchProductsByName);

   document.getElementById('searchProduct')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchProductsByName();
    }
  });


  document.getElementById('productForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    saveProduct();
  });

  document.querySelector('#productModal .close')?.addEventListener('click', function() {
    document.getElementById('productModal').style.display = 'none';
  });

  document.querySelectorAll('#productsTable th.sortable').forEach(th => {
    if (!th.getAttribute('data-original-text')) {
      th.setAttribute('data-original-text', th.textContent.trim());
    }

    th.addEventListener('click', () => {
      const column = th.dataset.sort;

      if (productSort.column === column) {
        productSort.direction = productSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        productSort.column = column;
        productSort.direction = 'asc';
      }

      loadProducts();
    });
  });
}
  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });
});
