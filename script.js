const users = {
    'admin': 'admin'  // Example admin user
};

const loginForm = document.getElementById('login-form');
const inventoryForm = document.getElementById('inventory-form');
const stockOutForm = document.getElementById('stock-out-form');
const fileInput = document.getElementById('file-input');
const importButton = document.getElementById('import-button');
const tableBody = document.getElementById('table-body');
const balanceBody = document.getElementById('balance-body');
const historyBody = document.getElementById('history-body');
const stockOutBody = document.getElementById('stock-out-body');
const itemNameSelect = document.getElementById('out-item-name');
const itemPriceInput = document.getElementById('out-price');
const totalAmountInput = document.getElementById('out-total');
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
const transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || [];
const stockOutRecords = JSON.parse(localStorage.getItem('stockOutRecords')) || [];

// Handle login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (users[username] && users[username] === password) {
        sessionStorage.setItem('role', username);
        document.getElementById('login').style.display = 'none';
        document.getElementById('inventory').style.display = 'block';
        showTab('stock-in');
        fetchInventory();
        fetchBalance();
        fetchHistory();
    } else {
        alert('Invalid login credentials.');
    }
});

// Handle inventory form submission
inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const vendor = document.getElementById('vendor').value.trim();
    const unit = document.getElementById('unit').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value.trim(), 10);
    const price = parseFloat(document.getElementById('price').value.trim());

    if (!name || !vendor || !unit || isNaN(quantity) || isNaN(price)) {
        alert("Please provide valid inputs.");
        return;
    }

    const existingItem = inventory.find(item => item.name.toLowerCase() === name.toLowerCase());

    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = price; // Update price if changed
    } else {
        inventory.push({ id: Date.now(), name, vendor, unit, quantity, price });
    }

    transactionHistory.push({
        itemName: name,
        type: 'Stock In',
        quantity,
        date: new Date().toLocaleString()
    });

    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));

    inventoryForm.reset();
    fetchInventory();
    fetchBalance();
    fetchHistory();
});

// Handle stock out form submission
stockOutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('out-item-name').value.trim();
    const quantity = parseInt(document.getElementById('out-quantity').value.trim(), 10);
    const price = parseFloat(itemPriceInput.value.trim());
    const date = document.getElementById('out-date').value.trim();
    const department = document.getElementById('out-department').value.trim();
    const hod = document.getElementById('out-hod').value.trim();
    const requestPerson = document.getElementById('out-request-person').value.trim();
    const issuer = document.getElementById('out-issuer').value.trim();
    const totalAmount = parseFloat(totalAmountInput.value.trim());

    if (!name || isNaN(quantity) || isNaN(price) || !date || !department || !hod || !requestPerson || !issuer || isNaN(totalAmount)) {
        alert("Please provide valid inputs.");
        return;
    }

    const item = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());

    if (item) {
        if (item.quantity >= quantity) {
            item.quantity -= quantity;
            stockOutRecords.push({
                itemName: name,
                quantity,
                price,
                totalAmount,
                date,
                department,
                hod,
                requestPerson,
                issuer
            });

            transactionHistory.push({
                itemName: name,
                type: 'Stock Out',
                quantity,
                date: new Date().toLocaleString()
            });

            localStorage.setItem('inventory', JSON.stringify(inventory));
            localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
            localStorage.setItem('stockOutRecords', JSON.stringify(stockOutRecords));

            fetchInventory();
            fetchBalance();
            fetchHistory();
            fetchStockOutRecords();
        } else {
            alert("Not enough stock to remove.");
        }
    } else {
        alert("Item not found.");
    }

    stockOutForm.reset();
});

// Handle import button click
importButton.addEventListener('click', () => {
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);

            json.forEach(row => {
                const { Name, Vendor, Unit, Quantity, 'Unit Price': Price } = row;
                if (Name && !isNaN(Quantity) && !isNaN(Price)) {
                    const existingItem = inventory.find(item => item.name.toLowerCase() === Name.toLowerCase());
                    if (existingItem) {
                        existingItem.quantity += parseInt(Quantity, 10);
                        existingItem.price = parseFloat(Price);
                    } else {
                        inventory.push({ id: Date.now(), name: Name, vendor: Vendor, unit: Unit, quantity: parseInt(Quantity, 10), price: parseFloat(Price) });
                    }
                }
            });

            localStorage.setItem('inventory', JSON.stringify(inventory));
            fetchInventory();
            fetchBalance();
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Please choose a file to import.');
    }
});

// Fetch and display inventory
function fetchInventory() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery)
    );

    tableBody.innerHTML = '';
    itemNameSelect.innerHTML = '<option value="">Select Item</option>';  // Reset options
    filteredInventory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.vendor}</td>
            <td>${item.unit}</td>
            <td>${item.quantity}</td>
            <td>$${(item.price || 0).toFixed(2)}</td>
            <td>
                ${sessionStorage.getItem('role') === 'admin' ? `
                    <button onclick="updateItem(${item.id})">Update</button>
                    <button onclick="deleteItem(${item.id})">Delete</button>
                ` : 'N/A'}
            </td>
        `;
        tableBody.appendChild(row);

        // Populate stock out dropdown
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        itemNameSelect.appendChild(option);
    });
}

// Fetch and display balance
function fetchBalance() {
    balanceBody.innerHTML = '';
    inventory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
        `;
        balanceBody.appendChild(row);
    });
}

// Fetch and display transaction history
function fetchHistory() {
    historyBody.innerHTML = '';
    transactionHistory.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.itemName}</td>
            <td>${transaction.type}</td>
            <td>${transaction.quantity}</td>
            <td>${transaction.date}</td>
        `;
        historyBody.appendChild(row);
    });
}

// Fetch and display stock out records
function fetchStockOutRecords() {
    stockOutBody.innerHTML = '';
    stockOutRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.itemName}</td>
            <td>${record.quantity}</td>
            <td>$${(record.price || 0).toFixed(2)}</td>
            <td>$${(record.totalAmount || 0).toFixed(2)}</td>
            <td>${record.date}</td>
            <td>${record.department}</td>
            <td>${record.hod}</td>
            <td>${record.requestPerson}</td>
            <td>${record.issuer}</td>
        `;
        stockOutBody.appendChild(row);
    });
}

// Update item in inventory
function updateItem(id) {
    const item = inventory.find(i => i.id === id);
    const name = prompt("Enter the new name:", item.name);
    const vendor = prompt("Enter the new vendor name:", item.vendor);
    const unit = prompt("Enter the new unit of measurement:", item.unit);
    const quantity = prompt("Enter the new quantity:", item.quantity);
    const price = prompt("Enter the new price:", item.price);

    if (!name || !vendor || !unit || isNaN(quantity) || isNaN(price)) {
        alert("Please provide valid inputs.");
        return;
    }

    item.name = name;
    item.vendor = vendor;
    item.unit = unit;
    item.quantity = parseInt(quantity, 10);
    item.price = parseFloat(price);
    localStorage.setItem('inventory', JSON.stringify(inventory));

    fetchInventory();
    fetchBalance();
}

// Delete item from inventory
function deleteItem(id) {
    inventory = inventory.filter(i => i.id !== id);
    localStorage.setItem('inventory', JSON.stringify(inventory));
    fetchInventory();
    fetchBalance();
}

// Export inventory to CSV
function exportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Vendor,Unit,Quantity,Unit Price\n";

    inventory.forEach(item => {
        csvContent += `${item.name},${item.vendor},${item.unit},${item.quantity},${(item.price || 0).toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory.csv");
    document.body.appendChild(link);  // Required for Firefox
    link.click();
}

// Generate report
function generateReport() {
    let totalValue = 0;
    let lowStockItems = [];
    inventory.forEach(item => {
        totalValue += item.quantity * item.price;
        if (item.quantity < 10) {  // Low stock threshold
            lowStockItems.push(item);
        }
    });

    let lowStockContent = lowStockItems.length > 0
        ? lowStockItems.map(item => `${item.name}: ${item.quantity} in stock`).join('<br>')
        : 'No items are low in stock.';

    document.getElementById('report-content').innerHTML = `
        <p>Total Stock Value: $${totalValue.toFixed(2)}</p>
        <p>Total Items: ${inventory.length}</p>
        <p>Low Stock Items:<br>${lowStockContent}</p>
    `;
}


// Fetch and display departments and tasks for filters
function populateFilters() {
    const departments = new Set();
    const tasks = new Set();
    
    stockOutRecords.forEach(record => {
        if (record.department) {
            departments.add(record.department);
        }
        if (record.task) {
            tasks.add(record.task);
        }
    });
    
    const departmentFilter = document.getElementById('department-filter');
    const taskFilter = document.getElementById('task-filter');
    
    departmentFilter.innerHTML = '<option value="">All Departments</option>';
    taskFilter.innerHTML = '<option value="">All Tasks</option>';
    
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
    });
    
    tasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        taskFilter.appendChild(option);
    });
}

// Generate department report
document.getElementById('generate-department-report').addEventListener('click', () => {
    const selectedDepartment = document.getElementById('department-filter').value;

    let totalQuantity = 0;
    let totalPrice = 0;

    const filteredRecords = selectedDepartment
        ? stockOutRecords.filter(record => record.department === selectedDepartment)
        : stockOutRecords;

    filteredRecords.forEach(record => {
        totalQuantity += record.quantity || 0;
        totalPrice += record.totalAmount || 0;
    });

    document.getElementById('department-report-content').innerHTML = `
        <p>Total Quantity for ${selectedDepartment || 'All Departments'}: ${totalQuantity}</p>
        <p>Total Price for ${selectedDepartment || 'All Departments'}: $${totalPrice.toFixed(2)}</p>
    `;
});

// Generate task report
document.getElementById('generate-task-report').addEventListener('click', () => {
    const selectedTask = document.getElementById('task-filter').value;
    
    let totalQuantity = 0;
    let totalPrice = 0;
    
    const filteredRecords = selectedTask
        ? stockOutRecords.filter(record => record.task === selectedTask)
        : stockOutRecords;
    
    filteredRecords.forEach(record => {
        totalQuantity += record.quantity;
        totalPrice += record.totalAmount;
    });
    
    document.getElementById('task-report-content').innerHTML = `
        <p>Total Quantity for ${selectedTask || 'All Tasks'}: ${totalQuantity}</p>
        <p>Total Price for ${selectedTask || 'All Tasks'}: $${totalPrice.toFixed(2)}</p>
    `;
});

// Initialize the Reports Tab with filter options
populateFilters();

// Initial load
fetchInventory();
fetchBalance();
fetchHistory();
fetchStockOutRecords();

// Show specific tab
function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';
}

// Update the price and total amount in the Stock Out form based on selected item
itemNameSelect.addEventListener('change', () => {
    const selectedItem = inventory.find(item => item.name === itemNameSelect.value);
    if (selectedItem) {
        itemPriceInput.value = selectedItem.price.toFixed(2);
        calculateTotalAmount();
    } else {
        itemPriceInput.value = '';
        totalAmountInput.value = '';
    }
});

document.getElementById('out-quantity').addEventListener('input', calculateTotalAmount);

// Calculate total amount based on quantity and unit price
function calculateTotalAmount() {
    const quantity = parseInt(document.getElementById('out-quantity').value.trim(), 10);
    const price = parseFloat(itemPriceInput.value.trim());

    if (!isNaN(quantity) && !isNaN(price)) {
        const totalAmount = quantity * price;
        totalAmountInput.value = totalAmount.toFixed(2);
    } else {
        totalAmountInput.value = '';
    }
}
// Populate dropdowns for departments and tasks
function populateFilters() {
    const departments = new Set();
    const tasks = new Set();
    
    stockOutRecords.forEach(record => {
        if (record.department) {
            departments.add(record.department);
        }
        if (record.task) {
            tasks.add(record.task);
        }
    });
    
    const departmentFilter = document.getElementById('department-filter');
    const taskFilter = document.getElementById('task-filter');
    
    departmentFilter.innerHTML = '<option value="">All Departments</option>';
    taskFilter.innerHTML = '<option value="">All Tasks</option>';
    
    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
    });
    
    tasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        taskFilter.appendChild(option);
    });
}

// Generate full report
document.getElementById('generate-full-report').addEventListener('click', () => {
    let totalQuantity = 0;
    let totalPrice = 0;
    
    let reportContent = `
        <h3>Full Report</h3>
        <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Total Price (Rs.)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    stockOutRecords.forEach(record => {
        totalQuantity += record.quantity || 0;
        totalPrice += record.totalAmount || 0;
        reportContent += `
            <tr>
                <td>${record.itemName}</td>
                <td>${record.quantity || 0}</td>
                <td>Rs. ${(record.totalAmount || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    reportContent += `
            </tbody>
        </table>
        <p>Total Quantity: ${totalQuantity}</p>
        <p>Total Price: Rs. ${totalPrice.toFixed(2)}</p>
    `;

    document.getElementById('full-report-content').innerHTML = reportContent;
});

// Generate department report
document.getElementById('generate-department-report').addEventListener('click', () => {
    const selectedDepartment = document.getElementById('department-filter').value;
    
    let totalQuantity = 0;
    let totalPrice = 0;
    
    const filteredRecords = selectedDepartment
        ? stockOutRecords.filter(record => record.department === selectedDepartment)
        : stockOutRecords;
    
    let reportContent = `
        <h3>Department Report for ${selectedDepartment || 'All Departments'}</h3>
        <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Total Price (Rs.)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredRecords.forEach(record => {
        totalQuantity += record.quantity || 0;
        totalPrice += record.totalAmount || 0;
        reportContent += `
            <tr>
                <td>${record.itemName}</td>
                <td>${record.quantity || 0}</td>
                <td>Rs. ${(record.totalAmount || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    reportContent += `
            </tbody>
        </table>
        <p>Total Quantity for ${selectedDepartment || 'All Departments'}: ${totalQuantity}</p>
        <p>Total Price for ${selectedDepartment || 'All Departments'}: Rs. ${totalPrice.toFixed(2)}</p>
    `;

    document.getElementById('department-report-content').innerHTML = reportContent;
});

// Generate task report
document.getElementById('generate-task-report').addEventListener('click', () => {
    const selectedTask = document.getElementById('task-filter').value;
    
    let totalQuantity = 0;
    let totalPrice = 0;
    
    const filteredRecords = selectedTask
        ? stockOutRecords.filter(record => record.task === selectedTask)
        : stockOutRecords;
    
    let reportContent = `
        <h3>Task Report for ${selectedTask || 'All Tasks'}</h3>
        <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Total Price (Rs.)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredRecords.forEach(record => {
        totalQuantity += record.quantity || 0;
        totalPrice += record.totalAmount || 0;
        reportContent += `
            <tr>
                <td>${record.itemName}</td>
                <td>${record.quantity || 0}</td>
                <td>Rs. ${(record.totalAmount || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    reportContent += `
            </tbody>
        </table>
        <p>Total Quantity for ${selectedTask || 'All Tasks'}: ${totalQuantity}</p>
        <p>Total Price for ${selectedTask || 'All Tasks'}: Rs. ${totalPrice.toFixed(2)}</p>
    `;

    document.getElementById('task-report-content').innerHTML = reportContent;
});

// Initialize the Reports Tab with filter options
populateFilters();

// Initial load
fetchInventory();
fetchBalance();
fetchHistory();
fetchStockOutRecords();
