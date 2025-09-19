

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS arunjuna_shop;

-- Use the created database
USE arunjuna_shop;

-- Table for users

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `mobile_number` VARCHAR(15) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for products
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(100),
  `description` TEXT,
  `price` DECIMAL(10, 2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `image_url` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE `order_address` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT,
  `full_name` VARCHAR(255) NOT NULL,
  `mobile_number` VARCHAR(15) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `address_line_1` VARCHAR(255) NOT NULL,
  `address_line_2` VARCHAR(255),
  `city` VARCHAR(255) NOT NULL,
  `postal_code` VARCHAR(10) NOT NULL,
  `country` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
-- Table for orders
--ALTER TABLE orders ADD payment_method VARCHAR(50) NOT NULL;
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `payment_method` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Table for order items
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT,
  `product_id` INT,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL, -- Price at the time of order
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
);
CREATE TABLE `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT,
  `user_id` INT,
  `username` VARCHAR(255) NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT,
  `image_url` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `contact_messages` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `name` VARCHAR(255) NOT NULL,
 `email` VARCHAR(255) NOT NULL,
 `message` TEXT NOT NULL,
 `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  git config --global user.email "mageshwaran.bmw.mmdu@gmail.com"
  git config --global user.name "mageshwaranbmwmmdu-glitch"