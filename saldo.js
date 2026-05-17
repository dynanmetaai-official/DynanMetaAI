// ========== SALDO MANAGER ==========
// Semua operasi saldo melalui file ini agar konsisten dan fast respon

const SaldoManager = {
    // Ambil semua users (cache dibaca langsung dari localStorage)
    getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    },
    
    // Simpan users (langsung write)
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    },
    
    // Ambil saldo member berdasarkan ID
    getSaldo(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        return user ? user.saldo : 0;
    },
    
    // Tambah saldo ke member (untuk owner) - LANGSUNG EKSEKUSI
    tambahSaldo(userId, amount) {
        if (amount <= 0) return { success: false, message: 'Jumlah harus lebih dari 0' };
        
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return { success: false, message: 'User tidak ditemukan' };
        if (users[userIndex].role !== 'member') return { success: false, message: 'Hanya bisa tambah saldo ke member' };
        
        // Langsung tambah saldo
        users[userIndex].saldo += amount;
        this.saveUsers(users);
        
        // Update session jika yang login adalah user ini
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            currentUser.saldo = users[userIndex].saldo;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return { 
            success: true, 
            message: `✅ Berhasil tambah Rp ${amount.toLocaleString('id-ID')}`, 
            newSaldo: users[userIndex].saldo 
        };
    },
    
    // Kurangi saldo member (untuk pembelian) - LANGSUNG EKSEKUSI
    kurangiSaldo(userId, amount) {
        if (amount <= 0) return { success: false, message: 'Jumlah tidak valid' };
        
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return { success: false, message: 'User tidak ditemukan' };
        if (users[userIndex].role !== 'member') return { success: false, message: 'Bukan akun member' };
        if (users[userIndex].saldo < amount) return { success: false, message: 'Saldo tidak mencukupi' };
        
        // Langsung kurangi saldo
        users[userIndex].saldo -= amount;
        this.saveUsers(users);
        
        // Update session
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            currentUser.saldo = users[userIndex].saldo;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return { 
            success: true, 
            message: `✅ Berhasil bayar Rp ${amount.toLocaleString('id-ID')}`, 
            newSaldo: users[userIndex].saldo 
        };
    },
    
    // Update session saldo (sync cepat)
    syncSessionSaldo(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId && user) {
            currentUser.saldo = user.saldo;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        return user ? user.saldo : 0;
    },
    
    // Simpan transaksi pembelian
    simpanTransaksi(userId, productName, qty, total) {
        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        transactions.unshift({ // unshift agar terbaru di atas
            id: Date.now(),
            user_id: userId,
            product_name: productName,
            qty: qty,
            total: total,
            date: new Date().toISOString()
        });
        localStorage.setItem('transactions', JSON.stringify(transactions));
    },
    
    // Simpan request topup
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
    
    // Konfirmasi topup oleh owner
    konfirmasiTopup(topupId) {
        const topups = JSON.parse(localStorage.getItem('topup_requests')) || [];
        const topupIndex = topups.findIndex(t => t.id === topupId);
        
        if (topupIndex === -1) return { success: false, message: 'Topup tidak ditemukan' };
        if (topups[topupIndex].status !== 'pending') return { success: false, message: 'Topup sudah diproses' };
        
        const amount = topups[topupIndex].amount;
        const userId = topups[topupIndex].user_id;
        
        // Tambah saldo member
        const saldoResult = this.tambahSaldo(userId, amount);
        
        if (saldoResult.success) {
            topups[topupIndex].status = 'completed';
            localStorage.setItem('topup_requests', JSON.stringify(topups));
        }
        
        return saldoResult;
    },
    
    // Hapus akun member (owner only)
    hapusMember(memberId) {
        const users = this.getUsers();
        const memberIndex = users.findIndex(u => u.id === memberId && u.role === 'member');
        
        if (memberIndex === -1) return { success: false, message: 'Member tidak ditemukan' };
        
        users.splice(memberIndex, 1);
        this.saveUsers(users);
        
        return { success: true, message: '✅ Member berhasil dihapus' };
    },
    
    // Ambil semua member
    getAllMembers() {
        const users = this.getUsers();
        return users.filter(u => u.role === 'member');
    },
    
    // Ambil semua produk
    getAllProducts() {
        return JSON.parse(localStorage.getItem('products')) || [];
    },
    
    // Tambah produk (owner only)
    tambahProduk(name, price, benefit) {
        const products = this.getAllProducts();
        const newId = products.length + 1;
        products.push({
            id: newId,
            name: name,
            price: price,
            benefit: benefit || 'Produk premium berkualitas'
        });
        localStorage.setItem('products', JSON.stringify(products));
        return { success: true, message: '✅ Produk berhasil ditambahkan', product: products[products.length - 1] };
    },
    
    // Hapus produk (owner only)
    hapusProduk(productId) {
        let products = this.getAllProducts();
        const exists = products.some(p => p.id === productId);
        if (!exists) return { success: false, message: 'Produk tidak ditemukan' };
        
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('products', JSON.stringify(products));
        return { success: true, message: '✅ Produk berhasil dihapus' };
    }
};

// Export untuk penggunaan global
window.SaldoManager = SaldoManager;
