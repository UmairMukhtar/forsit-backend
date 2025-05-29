const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const moment = require("moment");

const app = express();
const PORT = 3000;

app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(cors());

const SERVER_URL = `http://localhost:${PORT}`

var productsData; 
var salesData; 


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.get("/", (req, res) => {
  res.json("<h1>Forsit Backend</h1>");
});

app.post("/upload-file", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const imageUrl = `${SERVER_URL}/uploads/${req.file.filename}`;

  res.send({
    message: "File uploaded successfully!",
    imageUrl: imageUrl,
    filename: req.file.filename,
    path: req.file.path,
  });
});

app.post("/add-new-product", (req, res) => {
  const newProduct = req.body;

  const filePath = path.join(__dirname, "data/products.json");
  let productData;

  try {
    const rawData = fs.readFileSync(filePath);
    productData = JSON.parse(rawData);
  } catch (error) {
    productData = { products: [] };
  }

  productData.products.push(newProduct);
  // console.log(productData.products)

  fs.writeFileSync(filePath, JSON.stringify(productData, null, 2));
  res.status(201).json({ message: "Product added successfully", product: newProduct });
});


app.post("/add-new-sale", (req, res) => {
  const newSale = req.body;
  const filePath = path.join(__dirname, "data/sales.json");

  let salesData;
  try {
    const rawData = fs.readFileSync(filePath);
    salesData = JSON.parse(rawData);
  } catch (err) {
    salesData = { sales: [] };
  }

  salesData.sales.push(newSale);
  fs.writeFileSync(filePath, JSON.stringify(salesData, null, 2));
  res.status(201).json({ message: "Sale added successfully", sale: newSale });
});

app.listen(PORT, () => {
  console.log(`Server running at ${SERVER_URL}`);
});

app.get("/view-all-products", (req, res) => {
  try {
    const productsRaw = fs.readFileSync(path.join(__dirname, "data/products.json"), "utf8");
    productsData = JSON.parse(productsRaw);
  } catch (err) {
    console.error("Error loading JSON data files:", err);
  }
  res.json(productsData);
});


app.get("/view-all-sales", (req, res) => {
  const { filter = "all", category } = req.query;

  const now = moment();
  try {
    const salesRaw = fs.readFileSync(path.join(__dirname, "data/sales.json"), "utf8");
    salesData = JSON.parse(salesRaw);
  } catch (err) {
    console.error("Error loading JSON data files:", err);
  }
  let filteredSales = salesData.sales;

  if (category) {
    filteredSales = filteredSales.filter(
      (sale) => sale.category?.toLowerCase() === category.toLowerCase()
    );
  }

  filteredSales = filteredSales.filter((sale) => {
    const saleDate = moment(sale.saleDate, "YYYY-MM-DD");
    switch (filter) {
      case "daily":
        return saleDate.isSame(now, "day");
      case "weekly":
        return saleDate.isSame(now, "week");
      case "monthly":
        return saleDate.isSame(now, "month");
      case "annually":
        return saleDate.isSame(now, "year");
      default:
        return true;
    }
  });

  const groupedData = {};

  filteredSales.forEach((sale) => {
    const saleDate = moment(sale.saleDate, "YYYY-MM-DD");
    let labelKey;

    switch (filter) {
      case "daily":
        labelKey = saleDate.format("HH:mm");
        break;
      case "weekly":
        labelKey = saleDate.format("dddd");
        break;
      case "monthly":
        labelKey = saleDate.format("D MMM");
        break;
      case "annually":
        labelKey = saleDate.format("MMM");
        break;
      default:
        labelKey = saleDate.format("YYYY-MM-DD");
    }

    if (!groupedData[labelKey]) {
      groupedData[labelKey] = 0;
    }
    groupedData[labelKey] += sale.saleCount;
  });

  const labels = Object.keys(groupedData);
  const data = Object.values(groupedData);

  const trendData = {
    labels,
    datasets: [
      {
        label: "Sales",
        data,
        backgroundColor: [
          "#42a5f5",
          "#66bb6a",
          "#ffa726",
          "#ec407a",
          "#ab47bc",
          "#26a69a",
          "#ff7043",
          "#7e57c2",
          "#26c6da",
          "#9ccc65",
          "#ffca28",
          "#8d6e63",
        ],
      },
    ],
  };

  res.json(trendData);
});


app.get("/view-product/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const item = data.find((item) => item.id === id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
  } else {
    res.json(item);
  }
});

app.put("/update-product/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const updatedItem = req.body;
  const index = data.findIndex((item) => item.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Item not found" });
  } else {
    data[index] = { ...data[index], ...updatedItem };
    res.json(data[index]);
  }
});

app.delete("/delete-product/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = data.findIndex((item) => item.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Item not found" });
  } else {
    const deletedItem = data.splice(index, 1);
    res.json(deletedItem[0]);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
