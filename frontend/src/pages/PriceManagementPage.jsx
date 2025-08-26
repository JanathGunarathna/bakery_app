import React, { useState, useEffect, useCallback } from "react";
import { firestore } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const SHOPS = [
  "Katuwawala",
  "Koswatta",
  "Arawwala",
  "Depanama",
  "Maharagama A",
  "Maharagama B",
  "Maharagama C",
];
const BAKERY_ITEMS = [
  "Normal bread",
  "Sandwich bread",
  "Half bread",
  "1/2 rose bread",
  "1/4 rose bread",
  "Tea bun",
  "Dagara bun",
  "Dot bun",
  "Cream bun",
  "Viyana Roll",
  "Jam bun",
  "Fish bun",
  "Sinisambol bun",
  "Othana Sausages",
  "Vegetable Bun",
  "Fish pastry",
  "Egg Pastry",
  "Sausages Pastry",
  "Fish Roll",
  "Egg Roll",
  "Vegetable Rotty",
  "Fish Rotty",
  "Chicken Pastry",
  "Wade",
  "patty -Vegetable",
  "Patty -fish",
  "Egg Bun",
  "Sausages Bun",
  "Hot dog",
  "Burger -Chicken",
  "Burger -Egg Bullseye",
  "Devel Sausages",
  "Omlet Bun",
  "Umbalakada Bun",
  "Semon Bun",
  "Fish finger",
  "Drumstick -Chicken",
  "Fish Cake",
  "Egg Pizza",
  "Sausages Pizza -cheese",
  "Sandwich -Egg",
  "Sandwich -fish",
  "Sandwich -Cheese",
  "string Hoppers",
  "Helapa",
  "Levaria",
  "Spanchi -Vanila",
  "Spanchi -Chocolate",
  "Cup Cake",
  "Daughnut",
  "Rock Bun",
  "Gnanakatha",
  "Pol Cake",
  "Swiss Roll",
  "Butter Cake",
  "100 Baby crush",
  "1/4 Side Rosed",
  "1/2 Side Rosed",
];

export default function AddPricePage({ onNavigate }) {
  // Dark mode state - using React state instead of localStorage
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // State management
  const [selectedShop, setSelectedShop] = useState(SHOPS[0]);
  const [priceData, setPriceData] = useState([]);
  const [editingPrices, setEditingPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Firestore collection reference
  const pricesRef = collection(firestore, "prices");

  // Navigation function with fallback
  const navigate = useNavigate();

  const navigateToPage = (page) => {
    navigate(page);
  };

  // Fetch price data from Firebase
  const fetchPriceData = useCallback(async () => {
    try {
      setLoading(true);
      const priceQuery = query(pricesRef);
      const priceSnapshot = await getDocs(priceQuery);

      const priceItems = priceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPriceData(priceItems);
      console.log("Fetched price data:", priceItems.length, "items");
    } catch (error) {
      console.error("Error fetching price data:", error);
      alert("Error loading price data. Please try again.");
      setPriceData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  // Get price for an item in the selected shop
  const getItemPrice = useCallback(
    (itemName) => {
      const priceRecord = priceData.find(
        (price) => price.itemName === itemName && price.shop === selectedShop
      );
      return priceRecord
        ? { price: parseFloat(priceRecord.price) || 0, id: priceRecord.id }
        : { price: null, id: null };
    },
    [priceData, selectedShop]
  );

  // Handle price editing
  const handlePriceEdit = useCallback(
    (itemName, value) => {
      const priceKey = `${selectedShop}_${itemName}`;
      const numValue = parseFloat(value) || 0;

      setEditingPrices((prev) => {
        const updated = { ...prev };
        if (value === "" || numValue === 0) {
          delete updated[priceKey];
        } else {
          updated[priceKey] = {
            itemName,
            shop: selectedShop,
            price: numValue,
          };
        }
        return updated;
      });
    },
    [selectedShop]
  );

  // Save prices to Firebase
  const handleSavePrices = useCallback(async () => {
    try {
      setSubmitting(true);

      const pricesToSave = Object.entries(editingPrices);

      if (pricesToSave.length === 0) {
        alert("No price changes to save.");
        return;
      }

      console.log("Saving", pricesToSave.length, "price changes...");

      const savePromises = pricesToSave.map(async ([priceKey, priceData]) => {
        const { itemName, shop, price } = priceData;
        const existingPrice = getItemPrice(itemName);

        const dataToSave = {
          itemName,
          shop,
          price: parseFloat(price),
          updatedAt: new Date().toISOString(),
        };

        try {
          if (existingPrice.id) {
            // Update existing price
            const docRef = doc(firestore, "prices", existingPrice.id);
            await updateDoc(docRef, dataToSave);
            console.log("Updated price for", itemName);
          } else {
            // Create new price
            await addDoc(pricesRef, {
              ...dataToSave,
              createdAt: new Date().toISOString(),
            });
            console.log("Created new price for", itemName);
          }
        } catch (itemError) {
          console.error(`Error saving price for ${itemName}:`, itemError);
          throw itemError;
        }
      });

      await Promise.all(savePromises);

      // Clear editing state and refresh data
      setEditingPrices({});
      await fetchPriceData();

      alert("All prices saved successfully!");
    } catch (error) {
      console.error("Error saving prices:", error);
      const errorMessage =
        error.code === "permission-denied"
          ? "Permission denied. Please check your Firebase permissions."
          : error.code === "unavailable"
          ? "Firebase service temporarily unavailable. Please try again."
          : `Failed to save prices: ${error.message}`;
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [editingPrices, getItemPrice, fetchPriceData]);

  // Delete price
  const handleDeletePrice = useCallback(
    async (itemName) => {
      if (
        !window.confirm(
          `Are you sure you want to delete the price for "${itemName}" in ${selectedShop}?`
        )
      ) {
        return;
      }

      try {
        const existingPrice = getItemPrice(itemName);
        if (existingPrice.id) {
          await deleteDoc(doc(firestore, "prices", existingPrice.id));
          await fetchPriceData();
          alert(`Price for "${itemName}" deleted successfully!`);
        }
      } catch (error) {
        console.error("Error deleting price:", error);
        alert("Error deleting price. Please try again.");
      }
    },
    [selectedShop, getItemPrice, fetchPriceData]
  );

  // Filter items based on search query
  const filteredItems = BAKERY_ITEMS.filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalItemsWithPrices = BAKERY_ITEMS.filter(
    (item) => getItemPrice(item).price !== null
  ).length;
  const totalEditingPrices = Object.keys(editingPrices).length;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800"
          : "bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100"
      }`}
    >
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigateToPage("/selection")}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              ← Back to Inventory
            </button>
            <h1
              className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? "from-purple-400 to-pink-400"
                  : "from-purple-600 to-pink-600"
              } bg-clip-text text-transparent mb-3`}
            >
              Price Management
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-3 rounded-full transition-all duration-300 ${
                isDarkMode
                  ? "bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                  : "bg-gray-800 hover:bg-gray-700 text-yellow-400"
              } shadow-lg hover:shadow-xl transform hover:scale-110`}
              title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
          </div>
          <p
            className={`text-lg ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Set and manage prices for all bakery items across different shops
          </p>
        </header>

        {/* Navigation Buttons */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 mb-6 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700/20"
              : "bg-white/80 border-white/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            🔗 Quick Navigation
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigateToPage("/selection")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📋 Daily Inventory
            </button>
            <button
              onClick={() => navigateToPage("/summary")}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📊 Summary Report
            </button>
            <button
              onClick={() => navigateToPage("/summary")}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📄 PDF Report
            </button>
          </div>
        </section>

        {/* Shop Selection and Controls */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 mb-6 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700/20"
              : "bg-white/80 border-white/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            🏪 Shop Selection & Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label
                htmlFor="shop-select"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Select Shop:
              </label>
              <select
                id="shop-select"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                {SHOPS.map((shop) => (
                  <option key={shop} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="search-items"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Search Items:
              </label>
              <input
                id="search-items"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bakery items..."
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200 placeholder-slate-400"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              />
            </div>

            <div className="flex gap-2">
              {totalEditingPrices > 0 && (
                <button
                  onClick={handleSavePrices}
                  disabled={submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save {totalEditingPrices} Price(s)</>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 mb-6 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/20"
              : "bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-purple-300" : "text-purple-800"
            }`}
          >
            📊 Price Coverage Statistics - {selectedShop}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {BAKERY_ITEMS.length}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Total Items
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-green-900/30" : "bg-green-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {totalItemsWithPrices}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Items with Prices
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-red-900/30" : "bg-red-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                {BAKERY_ITEMS.length - totalItemsWithPrices}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}
              >
                Missing Prices
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-yellow-900/30" : "bg-yellow-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
              >
                {totalEditingPrices}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-yellow-300" : "text-yellow-700"
                }`}
              >
                Unsaved Changes
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div
              className={`w-full bg-gray-200 rounded-full h-2 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (totalItemsWithPrices / BAKERY_ITEMS.length) * 100
                  }%`,
                }}
              ></div>
            </div>
            <p
              className={`text-sm mt-2 text-center ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Price Coverage:{" "}
              {Math.round((totalItemsWithPrices / BAKERY_ITEMS.length) * 100)}%
            </p>
          </div>
        </section>

        {/* Price Table */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-xl border overflow-hidden transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/90 border-gray-700/20"
              : "bg-white/90 border-white/20"
          }`}
        >
          <div
            className={`p-6 border-b ${
              isDarkMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <h2
              className={`text-xl font-semibold flex items-center gap-2 ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}
            >
              💰 Price Table - {selectedShop}
            </h2>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {searchQuery
                ? `Showing ${filteredItems.length} items matching "${searchQuery}"`
                : `All ${BAKERY_ITEMS.length} bakery items`}
              {totalEditingPrices > 0 && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode
                      ? "bg-yellow-900/50 text-yellow-300"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  ⏳ {totalEditingPrices} unsaved changes
                </span>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`sticky top-0 transition-colors duration-300 ${
                  isDarkMode ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <tr>
                  <th
                    className={`px-6 py-4 text-left text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Item Name
                  </th>
                  <th
                    className={`px-6 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Current Price (Rs.)
                  </th>
                  <th
                    className={`px-6 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    New Price (Rs.)
                  </th>
                  <th
                    className={`px-6 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y transition-colors duration-300 ${
                  isDarkMode ? "divide-slate-700" : "divide-slate-200"
                }`}
              >
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                        <p
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Loading price data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        No items found matching "{searchQuery}"
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((itemName, index) => {
                    const { price: currentPrice, id: priceId } =
                      getItemPrice(itemName);
                    const priceKey = `${selectedShop}_${itemName}`;
                    const editingPrice = editingPrices[priceKey];
                    const hasUnsavedChanges = !!editingPrice;

                    return (
                      <tr
                        key={itemName}
                        className={`transition-colors duration-150 ${
                          hasUnsavedChanges
                            ? isDarkMode
                              ? "bg-yellow-900/20 hover:bg-yellow-800/30"
                              : "bg-yellow-50/50 hover:bg-yellow-100/50"
                            : currentPrice !== null
                            ? isDarkMode
                              ? "bg-green-900/20 hover:bg-green-800/30"
                              : "bg-green-50/50 hover:bg-green-100/50"
                            : isDarkMode
                            ? "hover:bg-slate-800/50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td
                          className={`px-6 py-4 text-sm font-medium ${
                            isDarkMode ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                hasUnsavedChanges
                                  ? "bg-yellow-500"
                                  : currentPrice !== null
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            ></span>
                            <span>{itemName}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-center">
                          {currentPrice !== null ? (
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                                isDarkMode
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              Rs. {currentPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                                isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Not Set
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              editingPrice
                                ? editingPrice.price
                                : currentPrice || ""
                            }
                            onChange={(e) =>
                              handlePriceEdit(itemName, e.target.value)
                            }
                            className={`w-24 text-center border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-300 ${
                              hasUnsavedChanges
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : currentPrice === null
                                ? isDarkMode
                                  ? "border-red-500 bg-red-900/20 text-slate-200"
                                  : "border-red-300 bg-red-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            placeholder="0.00"
                          />
                        </td>

                        <td className="px-6 py-4 text-sm text-center">
                          {currentPrice !== null && (
                            <button
                              onClick={() => handleDeletePrice(itemName)}
                              className={`px-3 py-1.5 rounded-lg transition-colors text-xs ${
                                isDarkMode
                                  ? "bg-red-700 hover:bg-red-600 text-white"
                                  : "bg-red-600 hover:bg-red-700 text-white"
                              }`}
                              title="Delete price"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer
          className={`text-center mt-8 py-6 text-sm ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <p>T & S Bakery - Price Management System</p>
          <p className="mt-1">
            Shop: {selectedShop} | Total Items: {BAKERY_ITEMS.length} | Priced
            Items: {totalItemsWithPrices} | Unsaved Changes:{" "}
            {totalEditingPrices}
          </p>
        </footer>
      </div>
    </div>
  );
}
