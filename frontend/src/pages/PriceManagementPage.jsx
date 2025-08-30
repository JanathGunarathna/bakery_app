import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  writeBatch,
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

// Toast notification component
const Toast = ({ toast, onRemove }) => {
  const getToastStyles = () => {
    const baseStyles = "fixed z-50 p-4 rounded-lg shadow-lg border transform transition-all duration-300 ease-in-out max-w-sm";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div className={getToastStyles()} style={{ top: `${1 + toast.index * 5}rem`, right: '1rem' }}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm mb-1">{toast.title}</div>
          )}
          <div className="text-sm">{toast.message}</div>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-current opacity-50 hover:opacity-100 transition-opacity ml-2 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function AddPricePage({ onNavigate }) {
  // Dark mode state - using React state instead of localStorage
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Add toast function
  const addToast = useCallback((message, type = 'info', title = null, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, title, duration }]);
  }, []);

  // Remove toast function
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // State management
  const [selectedShop, setSelectedShop] = useState(SHOPS[0]);
  const [priceData, setPriceData] = useState([]);
  const [shopItemsData, setShopItemsData] = useState([]);
  const [editingPrices, setEditingPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newItemName, setNewItemName] = useState("");

  // Firestore collection references
  const pricesRef = collection(firestore, "prices");
  const shopItemsRef = collection(firestore, "shopItems");

  // Navigation function with fallback
  const navigate = useNavigate();

  const navigateToPage = (page) => {
    navigate(page);
  };

  // Get bakery items for selected shop (sorted by order field)
  const getBakeryItemsForShop = useCallback((shop) => {
    return shopItemsData
      .filter(item => item.shop === shop)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({
        name: item.itemName,
        id: item.id,
        order: item.order || 0
      }));
  }, [shopItemsData]);

  const BAKERY_ITEMS = useMemo(() => {
    return getBakeryItemsForShop(selectedShop);
  }, [getBakeryItemsForShop, selectedShop]);

  // Fetch price data and shop items from Firebase
  const fetchPriceData = useCallback(async () => {
    try {
      setLoading(true);
      const priceQuery = query(pricesRef);
      const priceSnapshot = await getDocs(priceQuery);

      const priceItems = priceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch shop items
      const shopItemsSnapshot = await getDocs(shopItemsRef);
      const shopItems = shopItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPriceData(priceItems);
      setShopItemsData(shopItems);
      console.log("Fetched price data:", priceItems.length, "items");
      console.log("Fetched shop items:", shopItems.length, "custom items");
    } catch (error) {
      console.error("Error fetching price data:", error);
      addToast("Error loading price data. Please try again.", 'error');
      setPriceData([]);
      setShopItemsData([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
        addToast("No price changes to save.", 'warning');
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

      addToast(`All ${pricesToSave.length} prices saved successfully!`, 'success');
    } catch (error) {
      console.error("Error saving prices:", error);
      const errorMessage =
        error.code === "permission-denied"
          ? "Permission denied. Please check your Firebase permissions."
          : error.code === "unavailable"
          ? "Firebase service temporarily unavailable. Please try again."
          : `Failed to save prices: ${error.message}`;
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [editingPrices, getItemPrice, fetchPriceData, addToast]);

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
          addToast(`Price for "${itemName}" deleted successfully!`, 'success');
        }
      } catch (error) {
        console.error("Error deleting price:", error);
        addToast("Error deleting price. Please try again.", 'error');
      }
    },
    [selectedShop, getItemPrice, fetchPriceData, addToast]
  );

  // Add new item to shop
  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim()) {
      addToast("Please enter an item name", 'warning');
      return;
    }

    const currentShopItems = getBakeryItemsForShop(selectedShop);
    if (currentShopItems.some(item => item.name === newItemName.trim())) {
      addToast("This item already exists for this shop", 'error');
      return;
    }

    try {
      // Get the highest order number for the current shop
      const maxOrder = currentShopItems.length > 0 
        ? Math.max(...currentShopItems.map(item => item.order)) 
        : 0;

      await addDoc(shopItemsRef, {
        shop: selectedShop,
        itemName: newItemName.trim(),
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      });

      setNewItemName("");
      await fetchPriceData(); // Refresh data to get the new item
      addToast(`Item "${newItemName.trim()}" added to ${selectedShop}`, 'success');
    } catch (error) {
      console.error("Error adding item:", error);
      addToast("Failed to add item. Please try again.", 'error');
    }
  }, [newItemName, selectedShop, getBakeryItemsForShop, fetchPriceData, addToast]);

  // Move item up in the list - ENHANCED VERSION
  const handleMoveItemUp = useCallback(async (itemName) => {
    if (reordering) {
      console.log("Already reordering, skipping");
      return;
    }
    
    try {
      setReordering(true);
      console.log("=== MOVE UP DEBUG ===");
      console.log("Selected shop:", selectedShop);
      console.log("Item to move:", itemName);
      
      // Get all items for the current shop (not filtered)
      const allShopItems = getBakeryItemsForShop(selectedShop);
      console.log("All shop items:", allShopItems.map(item => `${item.name} (order: ${item.order})`));
      
      // Find the current item index in the complete list
      const currentIndex = allShopItems.findIndex(item => item.name === itemName);
      console.log("Current index:", currentIndex);
      
      if (currentIndex <= 0) {
        console.log("Item is already at the top or not found");
        return;
      }

      // Get the items to swap
      const currentItem = allShopItems[currentIndex];
      const previousItem = allShopItems[currentIndex - 1];

      console.log("Current item:", currentItem);
      console.log("Previous item:", previousItem);

      // Find the full item data from shopItemsData
      const currentItemData = shopItemsData.find(item => 
        item.itemName === currentItem.name && item.shop === selectedShop
      );
      const previousItemData = shopItemsData.find(item => 
        item.itemName === previousItem.name && item.shop === selectedShop
      );

      console.log("Current item DB data:", currentItemData);
      console.log("Previous item DB data:", previousItemData);

      if (!currentItemData || !previousItemData) {
        console.error("Item data not found in database");
        throw new Error("Item data not found in database");
      }

      // Create new order values to ensure they're different
      const tempOrder = Math.max(currentItem.order, previousItem.order) + 1000;
      
      console.log("=== UPDATING DATABASE ===");
      console.log(`Step 1: Setting ${currentItem.name} to temp order ${tempOrder}`);
      
      // Step 1: Set current item to temporary order to avoid conflicts
      const currentItemRef = doc(firestore, "shopItems", currentItemData.id);
      await updateDoc(currentItemRef, {
        order: tempOrder,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 2: Setting ${previousItem.name} to order ${currentItem.order}`);
      
      // Step 2: Set previous item to current item's original order
      const previousItemRef = doc(firestore, "shopItems", previousItemData.id);
      await updateDoc(previousItemRef, {
        order: currentItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 3: Setting ${currentItem.name} to order ${previousItem.order}`);
      
      // Step 3: Set current item to previous item's original order
      await updateDoc(currentItemRef, {
        order: previousItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log("Database updates completed, refreshing data...");
      
      // Wait a bit before refreshing to ensure Firebase has processed
      setTimeout(async () => {
        await fetchPriceData();
        console.log("Data refreshed successfully");
      }, 500);
      
    } catch (error) {
      console.error("Error moving item up:", error);
      addToast(`Failed to move item up: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        setReordering(false);
        console.log("Reordering state reset");
      }, 1000);
    }
  }, [selectedShop, getBakeryItemsForShop, shopItemsData, fetchPriceData, reordering, addToast]);

  // Move item down in the list - ENHANCED VERSION
  const handleMoveItemDown = useCallback(async (itemName) => {
    if (reordering) {
      console.log("Already reordering, skipping");
      return;
    }
    
    try {
      setReordering(true);
      console.log("=== MOVE DOWN DEBUG ===");
      console.log("Selected shop:", selectedShop);
      console.log("Item to move:", itemName);
      
      // Get all items for the current shop (not filtered)
      const allShopItems = getBakeryItemsForShop(selectedShop);
      console.log("All shop items:", allShopItems.map(item => `${item.name} (order: ${item.order})`));
      
      // Find the current item index in the complete list
      const currentIndex = allShopItems.findIndex(item => item.name === itemName);
      console.log("Current index:", currentIndex);
      
      if (currentIndex >= allShopItems.length - 1 || currentIndex === -1) {
        console.log("Item is already at the bottom or not found");
        return;
      }

      // Get the items to swap
      const currentItem = allShopItems[currentIndex];
      const nextItem = allShopItems[currentIndex + 1];

      console.log("Current item:", currentItem);
      console.log("Next item:", nextItem);

      // Find the full item data from shopItemsData
      const currentItemData = shopItemsData.find(item => 
        item.itemName === currentItem.name && item.shop === selectedShop
      );
      const nextItemData = shopItemsData.find(item => 
        item.itemName === nextItem.name && item.shop === selectedShop
      );

      console.log("Current item DB data:", currentItemData);
      console.log("Next item DB data:", nextItemData);

      if (!currentItemData || !nextItemData) {
        console.error("Item data not found in database");
        throw new Error("Item data not found in database");
      }

      // Create new order values to ensure they're different
      const tempOrder = Math.max(currentItem.order, nextItem.order) + 1000;
      
      console.log("=== UPDATING DATABASE ===");
      console.log(`Step 1: Setting ${currentItem.name} to temp order ${tempOrder}`);
      
      // Step 1: Set current item to temporary order to avoid conflicts
      const currentItemRef = doc(firestore, "shopItems", currentItemData.id);
      await updateDoc(currentItemRef, {
        order: tempOrder,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 2: Setting ${nextItem.name} to order ${currentItem.order}`);
      
      // Step 2: Set next item to current item's original order
      const nextItemRef = doc(firestore, "shopItems", nextItemData.id);
      await updateDoc(nextItemRef, {
        order: currentItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log(`Step 3: Setting ${currentItem.name} to order ${nextItem.order}`);
      
      // Step 3: Set current item to next item's original order
      await updateDoc(currentItemRef, {
        order: nextItem.order,
        updatedAt: new Date().toISOString()
      });

      console.log("Database updates completed, refreshing data...");
      
      // Wait a bit before refreshing to ensure Firebase has processed
      setTimeout(async () => {
        await fetchPriceData();
        console.log("Data refreshed successfully");
      }, 500);
      
    } catch (error) {
      console.error("Error moving item down:", error);
      addToast(`Failed to move item down: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        setReordering(false);
        console.log("Reordering state reset");
      }, 1000);
    }
  }, [selectedShop, getBakeryItemsForShop, shopItemsData, fetchPriceData, reordering, addToast]);

  // Filter items based on search query
  const filteredItems = BAKERY_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalItemsWithPrices = BAKERY_ITEMS.filter(
    (item) => getItemPrice(item.name).price !== null
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
      {/* Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            toast={{ ...toast, index }}
            onRemove={removeToast}
          />
        ))}
      </div>

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
                  disabled={submitting || reordering}
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

          {/* Add New Item Section */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className={`text-md font-semibold mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              ➕ Add New Item to {selectedShop}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter new item name"
                className={`flex-1 border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
              />
              <button
                onClick={handleAddItem}
                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Add Item
              </button>
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
                    BAKERY_ITEMS.length > 0 
                      ? (totalItemsWithPrices / BAKERY_ITEMS.length) * 100
                      : 0
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
              {BAKERY_ITEMS.length > 0 
                ? Math.round((totalItemsWithPrices / BAKERY_ITEMS.length) * 100)
                : 0}%
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
              {reordering && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode
                      ? "bg-blue-900/50 text-blue-300"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  🔄 Reordering...
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
                        {searchQuery ? `No items found matching "${searchQuery}"` : `No items found for ${selectedShop}`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, filteredIndex) => {
                    const itemName = item.name;
                    const { price: currentPrice, id: priceId } =
                      getItemPrice(itemName);
                    const priceKey = `${selectedShop}_${itemName}`;
                    const editingPrice = editingPrices[priceKey];
                    const hasUnsavedChanges = !!editingPrice;

                    // Find the actual index in the complete BAKERY_ITEMS array
                    const actualIndex = BAKERY_ITEMS.findIndex(bakeryItem => bakeryItem.name === itemName);
                    const isFirst = actualIndex === 0;
                    const isLast = actualIndex === BAKERY_ITEMS.length - 1;

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
                            <div className="flex ml-2 gap-1">
                              <button
                                onClick={() => handleMoveItemUp(itemName)}
                                disabled={isFirst || reordering}
                                className={`text-xs p-1.5 rounded transition-colors ${
                                  isFirst || reordering
                                    ? "opacity-30 cursor-not-allowed"
                                    : isDarkMode
                                    ? "hover:bg-gray-600 text-slate-300"
                                    : "hover:bg-gray-200 text-slate-600"
                                }`}
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveItemDown(itemName)}
                                disabled={isLast || reordering}
                                className={`text-xs p-1.5 rounded transition-colors ${
                                  isLast || reordering
                                    ? "opacity-30 cursor-not-allowed"
                                    : isDarkMode
                                    ? "hover:bg-gray-600 text-slate-300"
                                    : "hover:bg-gray-200 text-slate-600"
                                }`}
                                title="Move down"
                              >
                                ↓
                              </button>
                            </div>
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
                            disabled={reordering}
                            className={`w-24 text-center border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-300 disabled:opacity-50 ${
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
                              disabled={reordering}
                              className={`px-3 py-1.5 rounded-lg transition-colors text-xs disabled:opacity-50 ${
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