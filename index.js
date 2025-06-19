const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `${process.env.URI}`;

// JWT related API
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1hr",
  });
  res.send({ token });
});

// Middleware
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  console.log("inside token", token);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("petuk_dbcollection");
    const topsell = database.collection("top_sell");
    const cartdb = database.collection("cartdb");
    const ordersdb = database.collection("ordersdb");

    // --- All Routes Should Be Defined Here, After DB Connection ---

    // Root route
    app.get("/", (req, res) => {
      res.send("Server is running...");
    });

    // Product Routes
    app.get("/top-food", async (req, res) => {
      const result = await topsell.find().toArray();
      res.send(result);
    });

    app.get("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: id };
        if (!query) {
          const query1 = { _id: new ObjectId(id) };
          const result1 = await topsell.findOne(query1);
          if (result1) {
            res.status(200).json(result1);
          } else {
            res.status(404).json({ message: "Document not found" });
          }
        }
        const result = await topsell.findOne(query);

        if (result) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "Document not found" });
        }
      } catch (error) {
        console.error("Error fetching food by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Cart Route
    // add card
    app.post("/cart/add", verifyToken, async (req, res) => {
      try {
        const { userEmail, productId, quantity } = req.body;
        console.log(userEmail);

        if (!userEmail || !productId || !quantity) {
          return res
            .status(400)
            .json({ message: "Email, productId, and quantity are required." });
        }

        const product = await topsell.findOne({ _id: productId });

        if (!product) {
          return res
            .status(404)
            .json({ message: "This product is not available in our store." });
        }

        const userCart = await cartdb.findOne({ userEmail: userEmail });

        if (userCart) {
          const existingItemIndex = userCart.items.findIndex(
            (item) => item.productId.toString() === productId
          );

          if (existingItemIndex > -1) {
            await cartdb.updateOne(
              {
                userEmail: userEmail,
                "items.productId": new ObjectId(productId),
              },
              { $inc: { "items.$.quantity": 1 } } // increment by 1 or quantity from body
            );
          } else {
            await cartdb.updateOne(
              { userEmail: userEmail },
              {
                $push: {
                  items: {
                    productId: new ObjectId(productId),
                    quantity: quantity,
                    ...product,
                  },
                },
              }
            );
          }
          res.status(200).json({ message: "Cart updated successfully." });
        } else {
          await cartdb.insertOne({
            userEmail: userEmail,
            items: [
              {
                productId: new ObjectId(productId),
                quantity: quantity,
                ...product,
              },
            ],
          });
          res.status(201).json({ message: "Product added to your cart." });
        }
      } catch (error) {
        console.error("Cart Error:", error);
        res.status(500).json({ message: "A server error occurred." });
      }
    });
    // fetch card
    app.get("/cart/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;

        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }

        const query = { userEmail: email };
        const result = await cartdb.findOne(query);

        if (!result) {
          return res.status(404).json({ message: "Cart not found" });
        }

        res.status(200).json(result);
      } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // delete Cart
    app.delete("/cart/remove", verifyToken, async (req, res) => {
      try {
        const { userEmail, productId } = req.body;

        if (!userEmail || !productId) {
          return res
            .status(400)
            .json({ message: "Email and productId are required." });
        }

        const result = await cartdb.updateOne(
          { userEmail: userEmail },
          {
            $pull: {
              items: { productId: new ObjectId(productId) },
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Item not found or already removed." });
        }

        res
          .status(200)
          .json({ message: "Item removed from cart successfully." });
      } catch (error) {
        console.error("Remove Cart Item Error:", error);
        res.status(500).json({ message: "A server error occurred." });
      }
    });

    // Praced
    app.post("/checkout", verifyToken, async (req, res) => {
      try {
        const { userEmail } = req.body;

        if (!userEmail) {
          return res.status(400).json({ message: "User email is required." });
        }

        const userCart = await cartdb.findOne({ userEmail });

        if (!userCart || userCart.items.length === 0) {
          return res.status(404).json({ message: "Cart is empty." });
        }

        const order = {
          userEmail,
          items: userCart.items,
          createdAt: new Date(),
          status: "placed",
        };

        await ordersdb.insertOne(order);

        for (const item of userCart.items) {
          await topsell.updateOne(
            { _id: item._id },

            {
              $inc: {
                sold: Number(item.quantity),
                purchaseCount: Number(item.quantity),
              },
            }
          );
        }

        await cartdb.updateOne({ userEmail }, { $set: { items: [] } });

        res.status(200).json({
          message:
            "Order placed, cart cleared, and sold & purchase count updated.",
        });
      } catch (error) {
        console.error("Checkout error:", error);
        res
          .status(500)
          .json({ message: "Something went wrong during checkout." });
      }
    });

    const { ObjectId } = require("mongodb");

    app.get("/checkout/:email", async (req, res) => {
      try {
        const email = req.params.email;
         console.log(email)

        if (!email) {
          return res.status(400).json({ message: "Email is required." });
        }

        const orders = await ordersdb.find({ userEmail: email }).toArray();;
        // console.log(orders)

        if (!orders || orders.length === 0) {
          return res
            .status(404)
            .json({ message: "No orders found for this email." });
        }

        res.status(200).json(orders);
      } catch (error) {
        console.error("Error fetching orders by email:", error);
        res
          .status(500)
          .json({ message: "Server error while fetching orders." });
      }
    });

    //  add food
    app.post("/add/topfood", verifyToken, async (req, res) => {
      try {
        const newFood = req.body;

        if (
          !newFood.foodName ||
          !Array.isArray(newFood.foodImage) ||
          newFood.foodImage.length === 0 ||
          !newFood.foodCategory ||
          typeof newFood.totalQuantity !== "number" ||
          typeof newFood.price !== "number" ||
          !newFood.description ||
          !newFood.addedBy ||
          !newFood.addedBy.name ||
          !newFood.addedBy.email
        ) {
          return res.status(400).json({
            message: "Invalid food data. Please fill in all required fields.",
          });
        }

        newFood.createdAt = new Date();
        newFood.purchaseCount = newFood.purchaseCount || 0;

        const result = await topsell.insertOne(newFood);

        if (result.insertedId) {
          res.status(201).json({
            message: "Food item added to top food successfully.",
            insertedId: result.insertedId,
          });
        } else {
          res.status(500).json({ message: "Failed to insert the food item." });
        }
      } catch (error) {
        console.error("Error in /add/topfood:", error);
        res
          .status(500)
          .json({ message: "Server error while adding food item." });
      }
    });

    // End

    // Server Health Check and Confirmation
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Start the server only after the database connection is successful
    app.listen(port, () => {
      console.log(`Server running at ${port}`);
    });
  } finally {
    // The client should not be closed here if the server is to remain running
    // await client.close();
  }
}

// Run the main function
run().catch(console.dir);
