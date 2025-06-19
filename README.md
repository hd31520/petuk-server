# 🥘 Petuk Backend - Food Management Web Application

This is the **backend server** for the **Petuk** web application — a restaurant food management system. It provides REST APIs for food browsing, cart operations, order management, and user-submitted food items, secured by JWT authentication.

---

## ⚙️ Technologies Used

| Technology     | Purpose                         |
|----------------|---------------------------------|
| Node.js        | Server runtime                  |
| Express.js     | Web framework                   |
| MongoDB        | NoSQL Database                  |
| Firebase Auth  | Frontend authentication source  |
| JWT            | Secure route protection         |
| CORS           | Cross-origin request handling   |
| dotenv         | Environment variable management |

---

## 🔐 Authentication

### JSON Web Token (JWT)
- `/jwt`: Issues a token for the logged-in user
- Middleware `verifyToken` used to protect sensitive routes
- Token is passed via `Authorization` header

---

## 🗃️ MongoDB Collections

- `top_sell` → All food items (default + user-added)
- `cartdb` → Stores user cart items
- `ordersdb` → Stores user orders

---

## 📁 API Endpoints

### 📍 Root

- `GET /`  
  Returns server status message

---

### 🥗 Food APIs

- `GET /top-food`  
  Fetch all top-selling food items

- `GET /foods/:id`  
  Fetch single food item by ID

---

### 🛒 Cart APIs (Protected)

- `POST /cart/add`  
  Add a product to user's cart or update quantity

- `GET /cart/:email`  
  Fetch cart items by user email

- `DELETE /cart/remove`  
  Remove a product from the user's cart

---

### 📦 Order APIs (Protected)

- `POST /checkout`  
  Convert cart to an order, update food stats, and clear cart

- `GET /checkout/:email`  
  Get all orders by user email

---

### 🍳 Add Food APIs (Protected)

- `POST /add/topfood`  
  Allows a user to add new food to the system

- `GET /my-added/:email`  
  Get all foods added by a specific user

- `DELETE /food/delete/:id`  
  Delete a food item added by the user

- `PUT /food/edit/:id`  
  Edit a previously added food item

---

## 🔐 JWT Middleware Example

```js
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: "unauthorized" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: "unauthorized" });
    req.decoded = decoded;
    next();
  });
};
