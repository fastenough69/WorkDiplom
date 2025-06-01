// API Configuration
const API_BASE_URL = 'http://localhost:8001';

// Common functions
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

// Login functionality
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
        // Исправлено: убрана лишняя скобка после login
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
// Users management
async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/get_users`);
    if (!response.ok) throw new Error('Failed to fetch users');

    const data = await response.json();

    // Преобразуем данные из формата [{row: [...]}] в [{id, phone, balance}]
    const usersData = data.map(item => ({
      id: item.row[0],
      phone: item.row[1],
      balance: item.row[2]
    }));

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
        <td>${user.balance}</td>
        <td>
          <button class="btn edit-btn" data-id="${user.id}">Edit</button>
          <button class="btn delete-btn" data-id="${user.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Добавляем обработчики событий для кнопок
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
    const response = await fetch(`${API_BASE_URL}/users/get_user?userId=${userId}`);
    if (!response.ok) throw new Error('Не удалось получить данные пользователя');

    const data = await response.json();
    console.log(data)

    // Проверяем формат ответа
    let phone, balance;
    if (Array.isArray(data.row)) {
      // Формат: [phone, balance]
      phone = data.row[1];
      balance = data.row[2];
    } else {
      throw new Error('Неверный формат данных пользователя');
    }

    // Заполняем форму
    document.getElementById('editUserId').value = userId;
    document.getElementById('editPhone').value = phone;
    document.getElementById('editBalance').value = balance;

    // Показываем модальное окно
    document.getElementById('editUserModal').style.display = 'block';
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    showError('Ошибка загрузки: ' + error.message);
  }
}

async function saveUserChanges() {
  const userId = document.getElementById('editUserId').value;
  const phone = document.getElementById('editPhone').value;
  const balance = document.getElementById('editBalance').value;

  try {
    const response = await fetch(`${API_BASE_URL}/users/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        phone: phone,
        balance: balance
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
      const response = await fetch(`${API_BASE_URL}/users/delete?id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete user');

      loadUsers();
    } catch (error) {
      showError('Failed to delete user: ' + error.message);
    }
  }
}

// Products management
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/market/get_data`);
    if (!response.ok) throw new Error('Failed to fetch products');

    const products = await response.json();

    const tableBody = document.querySelector('#productsTable tbody');
    if (!tableBody) return;

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
    const response = await fetch(`${API_BASE_URL}/market/get_product?productId=${productId}`);
    if (!response.ok) throw new Error('Failed to fetch product data');

    const data = await response.json();

    // Проверяем и извлекаем данные из массива row
    if (!data.row || !Array.isArray(data.row)) {
      throw new Error('Invalid product data format: expected array "row"');
    }

    const productData = data.row;

    // Заполняем форму данными из массива
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = productData[0] || '';        // ID (первый элемент)
    document.getElementById('productName').value = productData[1] || '';      // Название продукта
    document.getElementById('productDescription').value = productData[2] || ''; // Описание
    document.getElementById('productPrice').value = productData[3] || 0;      // Цена
    document.getElementById('productQuantity').value = productData[4] || 0;    // Количество (если есть)

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

  try {
    if (productId) {
      // Обновление существующего товара - используем Body (как в вашем @app.put("/market/update"))
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
    } else {
      // Добавление нового товара - параметры в URL (как в вашем @app.post("/market/insert"))
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
    }

    document.getElementById('productModal').style.display = 'none';
    loadProducts();
  } catch (error) {
    showError('Ошибка при сохранении товара: ' + error.message);
  }
}

async function deleteProduct(productId) {
  try {
    // Получаем информацию о товаре
    const productResponse = await fetch(`${API_BASE_URL}/market/get_product?productId=${productId}`);
    if (!productResponse.ok) throw new Error('Ошибка при получении данных товара');

    const productData = await productResponse.json();

    // Проверяем структуру данных и извлекаем название товара
    if (!productData.row || !Array.isArray(productData.row) || productData.row.length < 2) {
      throw new Error('Неверный формат данных товара');
    }

    const productName = productData.row[1]; // Название товара находится по индексу 1

    if (confirm(`Вы уверены, что хотите удалить "${productName}"?`)) {
      // Удаление товара по имени
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
    const response = await fetch(`${API_BASE_URL}/orders/get_data`);
    if (!response.ok) throw new Error('Не удалось загрузить заказы');

    const orders = await response.json();

    const tableBody = document.querySelector('#ordersTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    orders.forEach(order => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${order.id}</td>
        <td>${order.user_id}</td>
        <td>${order.product_id}</td>
        <td>${order.quantity}</td>
        <td>${order.total_price}</td>
        <td>${order.status}</td>
        <td>${new Date(order.date).toLocaleString()}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    showError('Ошибка загрузки заказов: ' + error.message);
  }
}


// Initialize the page
// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Setup login only on login page
  if (document.getElementById('loginForm')) {
    setupLogin();
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Users page
  if (document.getElementById('usersTable')) {
    loadUsers();

    const refreshBtn = document.getElementById('refreshUsersBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadUsers);

    const editForm = document.getElementById('editUserForm');
    if (editForm) editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveUserChanges();
    });

    const closeBtn = document.querySelector('#editUserModal .close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      document.getElementById('editUserModal').style.display = 'none';
    });
  }

  // Orders page
  if (document.getElementById('ordersTable')) {
    loadOrders();

    const refreshBtn = document.getElementById('refreshOrdersBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadOrders);
  }

  // Market page
  if (document.getElementById('productsTable')) {
    loadProducts();

    const refreshBtn = document.getElementById('refreshProductsBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadProducts);

    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) addBtn.addEventListener('click', openAddProductModal);

    const productForm = document.getElementById('productForm');
    if (productForm) productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProduct();
    });

    const closeBtn = document.querySelector('#productModal .close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      document.getElementById('productModal').style.display = 'none';
    });
  }

  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });
});
