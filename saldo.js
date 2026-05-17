// ========== SALDO MANAGER - FAST RESPON ==========
window.SaldoManager = {
    // ===== USER =====
    getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    },
    
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    },
    
    getSaldo(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        return user ? user.saldo : 0;
    },
    
    tambahSaldo(userId, amount) {
        if (amount <= 0) return { success: false, message: 'Jumlah harus lebih dari 0' };
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return { success: false, message: 'User tidak ditemukan' };
        if (users[userIndex].role !== 'member') return { success: false, message: 'Hanya bisa tambah saldo ke member' };
        
        users[userIndex].saldo += amount;
        this.saveUsers(users);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            currentUser.saldo = users[userIndex].saldo;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        return { success: true, message: `✅ Berhasil tambah Rp ${amount.toLocaleString('id-ID')}`, newSaldo: users[userIndex].saldo };
    },
    
    kurangiSaldo(userId, amount) {
        if (amount <= 0) return { success: false, message: 'Jumlah tidak valid' };
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return { success: false, message: 'User tidak ditemukan' };
        if (users[userIndex].role !== 'member') return { success: false, message: 'Bukan akun member' };
        if (users[userIndex].saldo < amount) return { success: false, message: 'Saldo tidak mencukupi' };
        
        users[userIndex].saldo -= amount;
        this.saveUsers(users);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            currentUser.saldo = users[userIndex].saldo;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        return { success: true, message: `✅ Berhasil bayar Rp ${amount.toLocaleString('id-ID')}`, newSaldo: users[userIndex].saldo };
    },
    
    updateProfile(userId, newUsername, newPassword) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return { success: false, message: 'User tidak ditemukan' };
        
        if (newUsername && newUsername !== users[userIndex].username) {
            const exists = users.some(u => u.username === newUsername && u.id !== userId);
            if (exists) return { success: false, message: 'Username sudah digunakan!' };
            users[userIndex].username = newUsername;
        }
        
        if (newPassword && newPassword.length >= 4) {
            users[userIndex].password = btoa(newPassword);
        } else if (newPassword && newPassword.length < 4) {
            return { success: false, message: 'Password minimal 4 karakter!' };
        }
        
        this.saveUsers(users);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            currentUser.username = users[userIndex].username;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        return { success: true, message: '✅ Profil berhasil diupdate!' };
    },
    
    hapusMember(memberId) {
        const users = this.getUsers();
        const memberIndex = users.findIndex(u => u.id === memberId && u.role === 'member');
        if (memberIndex === -1) return { success: false, message: 'Member tidak ditemukan' };
        users.splice(memberIndex, 1);
        this.saveUsers(users);
        return { success: true, message: '✅ Member berhasil dihapus' };
    },
    
    getAllMembers() {
        const users = this.getUsers();
        return users.filter(u => u.role === 'member');
    },
    
    // ===== PRODUK =====
    getAllProducts() {
        return JSON.parse(localStorage.getItem('products')) || [];
    },
    
    tambahProduk(name, price, benefit) {
        const products = this.getAllProducts();
        const newId = products.length + 1;
        const newProduct = {
            id: newId,
            name: name,
            price: parseInt(price),
            benefit: benefit || 'Produk premium berkualitas'
        };
        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));
        return { success: true, message: '✅ Produk berhasil ditambahkan', product: newProduct };
    },
    
    hapusProduk(productId) {
        let products = this.getAllProducts();
        if (!products.some(p => p.id === productId)) {
            return { success: false, message: 'Produk tidak ditemukan' };
        }
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('products', JSON.stringify(products));
        return { success: true, message: '✅ Produk berhasil dihapus' };
    },
    
    // ===== TOPUP =====
    simpanTopupRequest(userId, amount, bukti) {
        const topups = JSON.parse(localStorage.getItem('topup_requests')) || [];
        topups.unshift({
            id: Date.now(),
            user_id: userId,
            amount: amount,
            bukti: bukti,
            status: 'pending',
            date: new Date().toISOString()
        });
        localStorage.setItem('topup_requests', JSON.stringify(topups));
        return { success: true, message: '✅ Permintaan topup dikirim ke owner' };
    },
    
    konfirmasiTopup(topupId) {
        const topups = JSON.parse(localStorage.getItem('topup_requests')) || [];
        const topupIndex = topups.findIndex(t => t.id === topupId);
        if (topupIndex === -1) return { success: false, message: 'Topup tidak ditemukan' };
        if (topups[topupIndex].status !== 'pending') return { success: false, message: 'Topup sudah diproses' };
        
        const amount = topups[topupIndex].amount;
        const userId = topups[topupIndex].user_id;
        const saldoResult = this.tambahSaldo(userId, amount);
        
        if (saldoResult.success) {
            topups[topupIndex].status = 'completed';
            localStorage.setItem('topup_requests', JSON.stringify(topups));
        }
        return saldoResult;
    },
    
    getAllTopupRequests() {
        return JSON.parse(localStorage.getItem('topup_requests')) || [];
    },
    
    // ===== TRANSAKSI =====
    simpanTransaksi(userId, productName, qty, total) {
        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        transactions.unshift({
            id: Date.now(),
            user_id: userId,
            product_name: productName,
            qty: qty,
            total: total,
            date: new Date().toISOString()
        });
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
};
