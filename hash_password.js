// hash_password.js
const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainPassword = 'admin'; // Change this

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }
    console.log('Your Hashed Password Is:');
    console.log(hash);
});
//INSERT INTO users (username, email, password, role) VALUES ('admin', 'mageshwaran.bmw.mmdu@gmail.com', '$2b$10$n71JY9IOblRmfJ6UOB.eculqngST1Nm70waWwPdG85qLeB/pUaxhC', 'admin');
//UPDATE users SET email = 'admin@gmail.com', password = '$2b$10$4lN0AjHRE.qFMUhRNWVE6ewNPRGlAx1D7OKNTzLcmZfUpDdHAckFC' WHERE role = 'admin';
//189323019060-dh1aj9t6ua6319u7vpl2otjhn19ireea.apps.googleusercontent.com
/*<div class="brands-grid">
                        <div class="brand-logo"><img src="uploads/6-ANCHOR_1.webp" alt="Anchor"></div>
                        <div class="brand-logo"><img src="uploads/21-HAVELLS_1.webp" alt="Havells"></div>
                        <div class="brand-logo"><img src="uploads/53-SYSKA.webp" alt="Syska"></div>
                        <div class="brand-logo"><img src="uploads/10-CROMPTON.webp" alt="Crompton"></div>
                        <div class="brand-logo"><img src="uploads/8-C_S_1.webp" alt="c&s"></div>
                        <div class="brand-logo"><img src="uploads/18-GOLDMEDAL.webp" alt="GOLDMEDAL"></div>
                        <div class="brand-logo"><img src="uploads/60-WIPRO.webp" alt="Wipro"></div>
                        <div class="brand-logo"><img src="uploads/39-LEGRAND.webp" alt="Legrand"></div>
                        <div class="brand-logo"><img src="uploads/L_and_T_logo.webp" alt="L&T"></div>
                        <div class="brand-logo"><img src="uploads/49-RR_KABEL.webp" alt="rr"></div>
                        <div class="brand-logo"><img src="uploads/17-GM.webp" alt="gm"></div>
                        <div class="brand-logo"><img src="uploads/14-ELECTRON_1.webp" alt="ELECTRON"></div>
                        <div class="brand-logo"><img src="uploads/19-GREATWHITE.webp" alt="Legrand"></div>
                        <div class="brand-logo"><img src="uploads/45-POLYCAB.webp" alt="Legrand"></div>
                        <div class="brand-logo"><img src="uploads/15-FINOLX.webp" alt="Legrand"></div>
                        <div class="brand-logo"><img src="uploads/3-9ELECTRIC.webp" alt="Legrand"></div>
                    </div>
                    
                    
                    
                    
                     <footer class="footer">
        <div class="container">
            <div class="footer-main">
                <div class="footer-col"><h3>Quick Links</h3><ul><li><a href="#home">Home</a></li><li><a href="#products">Products</a></li><li><a href="#contact">Contact</a></li></ul></div>
                <div class="footer-col"><h3>Follow Us</h3><ul><li><a href="#">Facebook</a></li><li><a href="#">Twitter</a></li><li><a href="#">Instagram</a></li></ul></div>
                <div class="footer-col"><h3>Reach Us</h3><p>Arunjuna Electricals Ltd,<br>Coimbatore, Tamil Nadu,<br>India.</p></div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Arunjuna Electrical Shop. All Rights Reserved.</p>
                <div class="payment-icons"><i class="fab fa-cc-visa"></i><i class="fab fa-cc-mastercard"></i><i class="fab fa-cc-paypal"></i></div>
            </div>
        </div>
    </footer>
    const ADMIN_EMAIL = 'mageshwaran.bmw.mmdu@gmail.com'; // NEW: Admin email for notifications
const ADMIN_EMAIL_PASSWORD = 'sukp hnrz fbbk wysy'; 
 <section class="category-showcase-section">
            <h2 class="section-title">Shop by Category</h2>
            <div class="container category-showcase-grid">
                <a href="#products" class="category-item" data-category="Appliances">
                    <div class="category-icon-bg">
                        <img src="uploads/download-removebg-preview (25)).png" alt="Appliances">
                    </div>
                    <span>Appliances</span>
                </a>
                <a href="#products" class="category-item" data-category="Fans">
                    <div class="category-icon-bg">
                        <img src="uploads/download-removebg-preview (25).png" alt="Fans">
                    </div>
                    <span>Fans</span>
                </a>
                <a href="#products" class="category-item" data-category="Lighting">
                    <div class="category-icon-bg">
                        <img src="uploads/2.png" alt="Lighting">
                    </div>
                    <span>Lighting</span>
                </a>
                <a href="#products" class="category-item" data-category="Measuring Instruments">
                    <div class="category-icon-bg">
                        <img src="uploads/3.png" alt="Measuring Instruments">
                    </div>
                    <span>Measuring Instruments</span>
                </a>
                <a href="#products" class="category-item" data-category="Power Solutions">
                    <div class="category-icon-bg">
                        <img src="uploads/OIP-removebg-preview (50).png" alt="Power Solutions">
                    </div>
                    <span>Power Solutions</span>
                </a>
                <a href="#products" class="category-item" data-category="Safety">
                    <div class="category-icon-bg">
                        <img src="uploads/download-removebg-preview (4).png" alt="Safety">
                    </div>
                    <span>Safety</span>
                </a>
                <a href="#products" class="category-item" data-category="Tools & Equipment">
                    <div class="category-icon-bg">
                        <img src="uploads/OIP-removebg-preview (32).png" alt="Tools & Equipment">
                    </div>
                    <span>Tools & Equipment</span>
                </a>
                <a href="#products" class="category-item" data-category="Wiring">
                    <div class="category-icon-bg">
                        <img src="uploads/OIP-removebg-preview (51).png" alt="Wiring">
                    </div>
                    <span>Wiring</span>
                </a>
            </div>
        </section>*/