import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
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

const BASE_BAKERY_ITEMS = [
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
  "1/2 Side Rosed"
];

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500"
  }[type] || "bg-gray-500";

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300 ease-in-out`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function SelectionPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [shopItemsData, setShopItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editedItems, setEditedItems] = useState(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [sessionChanges, setSessionChanges] = useState({});
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [toast, setToast] = useState(null);

  const [filters, setFilters] = useState({
    shop: SHOPS[0],
    date: new Date().toISOString().split("T")[0],
  });

  const navigate = useNavigate();

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const getBakeryItemsForShop = useCallback((shop) => {
    const shopSpecificItems = shopItemsData
      .filter(item => item.shop === shop)
      .map(item => item.itemName);
    
    // Combine base items with shop-specific items, maintaining base order
    const allItems = [...BASE_BAKERY_ITEMS, ...shopSpecificItems];
    // Remove duplicates while preserving order
    return [...new Set(allItems)];
  }, [shopItemsData]);

  const BAKERY_ITEMS = useMemo(() => {
    return getBakeryItemsForShop(filters.shop);
  }, [getBakeryItemsForShop, filters.shop]);

  const navigateDate = useCallback((days) => {
    const currentDate = new Date(filters.date);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split("T")[0];
    handleFilterChange("date", newDate);
  }, [filters.date]);

  const getItemPrice = useCallback((itemName, shop) => {
    const priceRecord = priceData.find(
      (price) => price.itemName === itemName && price.shop === shop
    );
    return priceRecord ? parseFloat(priceRecord.price) || 0 : null;
  }, [priceData]);

  const getPreviousDayRemaining = useCallback((itemName, shop, currentDate) => {
    if (!itemName || !shop || !currentDate) return 0;

    const currentDateObj = new Date(currentDate);
    const previousDate = new Date(currentDateObj);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split("T")[0];

    const previousDayData = inventoryData.find(
      (item) =>
        item.itemName === itemName &&
        item.shop === shop &&
        item.date === previousDateStr
    );

    return previousDayData ? parseInt(previousDayData.remainingInventory) || 0 : 0;
  }, [inventoryData]);

  const completeTableData = useMemo(() => {
    const { shop, date } = filters;
    if (!shop || !date) return [];

    return BAKERY_ITEMS.map((itemName) => {
      const existingData = inventoryData.find(
        (item) =>
          item.itemName === itemName && item.shop === shop && item.date === date
      );

      const itemKey = `${shop}_${date}_${itemName}`;
      const sessionChange = sessionChanges[itemKey];
      const previousDayRemaining = getPreviousDayRemaining(itemName, shop, date);
      const itemPrice = getItemPrice(itemName, shop);

      const morningTime = sessionChange
        ? parseInt(sessionChange.morningTime) || 0
        : parseInt(existingData?.morningTime) || 0;

      const eveningTime = sessionChange
        ? parseInt(sessionChange.eveningTime) || 0
        : parseInt(existingData?.eveningTime) || 0;

      const extraIn = sessionChange
        ? parseInt(sessionChange.extraIn) || 0
        : parseInt(existingData?.extraIn) || 0;

      const transferOut = sessionChange
        ? parseInt(sessionChange.transferOut) || 0
        : parseInt(existingData?.transferOut) || 0;

      const discard = sessionChange
        ? parseInt(sessionChange.discard) || 0
        : parseInt(existingData?.discard) || 0;

      const remainingInventory = sessionChange
        ? parseInt(sessionChange.remainingInventory) || 0
        : parseInt(existingData?.remainingInventory) || 0;

      const startingInventory = previousDayRemaining + morningTime + eveningTime + extraIn;
      const selling = Math.max(0, startingInventory - remainingInventory - transferOut - discard);
      const totalValue = itemPrice !== null ? selling * itemPrice : null;

      return {
        id: itemKey,
        itemName,
        shop,
        date,
        previousDayRemaining,
        morningTime,
        eveningTime,
        extraIn,
        startingInventory,
        selling,
        transferOut,
        discard,
        remainingInventory,
        price: itemPrice,
        totalValue,
        isExisting: !!existingData,
        firestoreId: existingData?.id,
        hasChanges: !!sessionChange,
        hasPriceMissing: itemPrice === null,
      };
    });
  }, [BAKERY_ITEMS, inventoryData, filters, getPreviousDayRemaining, sessionChanges, getItemPrice]);

  const itemsWithMissingPrices = useMemo(() => {
    return completeTableData.filter((item) => {
      const hasInventoryData =
        item.eveningTime > 0 ||
        item.extraIn > 0 ||
        item.morningTime > 0 ||
        item.remainingInventory > 0 ||
        item.transferOut > 0 ||
        item.discard > 0;
      return hasInventoryData && item.hasPriceMissing;
    });
  }, [completeTableData]);

  const totalSalesValue = useMemo(() => {
    return completeTableData.reduce((sum, item) => {
      return sum + (item.totalValue || 0);
    }, 0);
  }, [completeTableData]);

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const inventoryRef = collection(firestore, "inventory");
      const pricesRef = collection(firestore, "prices");
      const shopItemsRef = collection(firestore, "shopItems");

      let inventoryItems = [];
      try {
        const inventoryQuery = query(inventoryRef, orderBy("createdAt", "desc"));
        const inventorySnapshot = await getDocs(inventoryQuery);
        inventoryItems = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (inventoryError) {
        const inventorySnapshot = await getDocs(inventoryRef);
        inventoryItems = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        inventoryItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
      }

      let priceItems = [];
      try {
        const priceSnapshot = await getDocs(pricesRef);
        priceItems = priceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (pricesError) {
        console.warn("Failed to fetch prices:", pricesError);
      }

      let shopItems = [];
      try {
        const shopItemsSnapshot = await getDocs(shopItemsRef);
        shopItems = shopItemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (shopItemsError) {
        console.warn("Failed to fetch shop items:", shopItemsError);
      }

      setInventoryData(inventoryItems);
      setPriceData(priceItems);
      setShopItemsData(shopItems);
      showToast("Data loaded successfully", "success");

    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message || "Failed to fetch data from Firestore");
      setInventoryData([]);
      setPriceData([]);
      setShopItemsData([]);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setEditedItems(new Set());
    setSessionChanges({});
    setHasUnsavedChanges(false);
  }, []);

  const handleCellEdit = useCallback((itemKey, field, value) => {
    const numValue = parseInt(value) || 0;
    const currentItem = completeTableData.find((item) => item.id === itemKey);
    if (!currentItem) return;

    setSessionChanges((prev) => {
      const existing = prev[itemKey] || {};
      const updated = { ...existing };
      updated[field] = numValue;

      const morningTime = parseInt(updated.morningTime) || parseInt(currentItem.morningTime) || 0;
      const eveningTime = parseInt(updated.eveningTime) || parseInt(currentItem.eveningTime) || 0;
      const extraIn = parseInt(updated.extraIn) || parseInt(currentItem.extraIn) || 0;
      const transferOut = parseInt(updated.transferOut) || parseInt(currentItem.transferOut) || 0;
      const discard = parseInt(updated.discard) || parseInt(currentItem.discard) || 0;
      const remainingInventory = parseInt(updated.remainingInventory) || parseInt(currentItem.remainingInventory) || 0;

      const startingInventory = currentItem.previousDayRemaining + morningTime + eveningTime + extraIn;
      const selling = Math.max(0, startingInventory - remainingInventory - transferOut - discard);

      updated.startingInventory = startingInventory;
      updated.selling = selling;
      updated.itemName = currentItem.itemName;
      updated.shop = currentItem.shop;
      updated.date = currentItem.date;
      updated.previousDayRemaining = currentItem.previousDayRemaining;
      updated.firestoreId = currentItem.firestoreId;

      return {
        ...prev,
        [itemKey]: updated,
      };
    });

    setEditedItems((prev) => new Set([...prev, itemKey]));
    setHasUnsavedChanges(true);
  }, [completeTableData]);

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim()) {
      showToast("Please enter an item name", "warning");
      return;
    }

    const currentShopItems = getBakeryItemsForShop(filters.shop);
    if (currentShopItems.includes(newItemName.trim())) {
      showToast("This item already exists for this shop", "warning");
      return;
    }

    try {
      const shopItemsRef = collection(firestore, "shopItems");
      await addDoc(shopItemsRef, {
        shop: filters.shop,
        itemName: newItemName.trim(),
        createdAt: new Date().toISOString(),
      });

      setShopItemsData(prev => [...prev, {
        shop: filters.shop,
        itemName: newItemName.trim(),
        createdAt: new Date().toISOString(),
      }]);

      setNewItemName("");
      setShowAddItemModal(false);
      
      showToast(`Item "${newItemName.trim()}" added to ${filters.shop}`, "success");
    } catch (error) {
      console.error("Error adding item:", error);
      showToast("Failed to add item. Please try again.", "error");
    }
  }, [newItemName, filters.shop, getBakeryItemsForShop, showToast]);

  const handleSaveChanges = useCallback(async () => {
    try {
      setSubmitting(true);

      const itemsToSave = Object.entries(sessionChanges).filter(
        ([itemKey, changes]) => {
          const hasAnyData = Object.keys(changes).some(
            (key) =>
              [
                "morningTime",
                "eveningTime",
                "extraIn",
                "remainingInventory",
                "transferOut",
                "discard",
              ].includes(key) && (parseInt(changes[key]) || 0) > 0
          );
          const isEdited = editedItems.has(itemKey);
          return isEdited && hasAnyData;
        }
      );

      if (itemsToSave.length === 0) {
        showToast("No changes detected to save", "warning");
        setHasUnsavedChanges(false);
        return;
      }

      const inventoryRef = collection(firestore, "inventory");

      const savePromises = itemsToSave.map(async ([itemKey, changes]) => {
        const dataToSave = {
          date: changes.date,
          shop: changes.shop,
          itemName: changes.itemName,
          previousDayRemaining: parseInt(changes.previousDayRemaining) || 0,
          morningTime: parseInt(changes.morningTime) || 0,
          eveningTime: parseInt(changes.eveningTime) || 0,
          extraIn: parseInt(changes.extraIn) || 0,
          startingInventory: parseInt(changes.startingInventory) || 0,
          selling: parseInt(changes.selling) || 0,
          transferOut: parseInt(changes.transferOut) || 0,
          discard: parseInt(changes.discard) || 0,
          remainingInventory: parseInt(changes.remainingInventory) || 0,
          updatedAt: new Date().toISOString(),
        };

        if (changes.firestoreId) {
          const docRef = doc(firestore, "inventory", changes.firestoreId);
          await updateDoc(docRef, dataToSave);
        } else {
          await addDoc(inventoryRef, {
            ...dataToSave,
            createdAt: new Date().toISOString(),
          });
        }
      });

      await Promise.all(savePromises);

      setEditedItems(new Set());
      setSessionChanges({});
      setHasUnsavedChanges(false);
      await fetchInventoryData();

      showToast(`Successfully saved ${itemsToSave.length} items!`, "success");

    } catch (error) {
      console.error("Error saving changes:", error);
      const errorMessage =
        error.code === "permission-denied"
          ? "Permission denied. Please check your Firebase permissions."
          : error.code === "unavailable"
          ? "Firebase service temporarily unavailable. Please try again."
          : `Failed to save changes: ${error.message}`;
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  }, [sessionChanges, editedItems, fetchInventoryData, showToast]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      }`}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <div className="container mx-auto px-4 py-6 max-w-full">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <h1
              className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? "from-blue-400 to-indigo-400"
                  : "from-blue-600 to-indigo-600"
              } bg-clip-text text-transparent mb-3`}
            >
              T & S Bakery Inventory
            </h1>
            <div className="flex-1 flex justify-end">
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
          </div>
          <p
            className={`text-lg ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Daily inventory tracking and management system
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={fetchInventoryData}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Retry Loading Data
            </button>
          </div>
        )}

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
            Quick Navigation
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/addPrice")}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📝 Price Management
            </button>
            <button
              onClick={() => navigate("/summary")}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📊 Summary Report
            </button>
            <button
              onClick={() => navigate("/summary")}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📄 Generate PDF
            </button>
          </div>
        </section>

        {/* Filters Section */}
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
            🏪 Select Shop & Date
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label
                htmlFor="shop-filter"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Select Shop:
              </label>
              <select
                id="shop-filter"
                value={filters.shop}
                onChange={(e) => handleFilterChange("shop", e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
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
                htmlFor="date-filter"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Select Date:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateDate(-1)}
                  className={`px-3 py-2.5 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  }`}
                  title="Previous day"
                >
                  ←
                </button>
                <input
                  id="date-filter"
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange("date", e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-slate-200"
                      : "bg-white border-slate-300 text-slate-700"
                  }`}
                />
                <button
                  onClick={() => navigateDate(1)}
                  className={`px-3 py-2.5 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  }`}
                  title="Next day"
                >
                  →
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  handleFilterChange(
                    "date",
                    new Date().toISOString().split("T")[0]
                  )
                }
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                📅 Today
              </button>
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                ➕ Add Item
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 text-sm"
                >
                  {submitting ? "💾 Saving..." : "💾 Save Changes"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Add Item Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg shadow-xl max-w-md w-full mx-4 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}>
                Add New Item to {filters.shop}
              </h3>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
                className={`w-full border rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
              <div className="flex gap-3">
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    setShowAddItemModal(false);
                    setNewItemName("");
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    isDarkMode
                      ? "bg-gray-600 hover:bg-gray-500 text-slate-200"
                      : "bg-gray-200 hover:bg-gray-300 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missing Prices Alert */}
        {itemsWithMissingPrices.length > 0 && (
          <section
            className={`border rounded-xl p-4 mb-6 transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900/20 border-red-700"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-medium mb-2 ${
                isDarkMode ? "text-red-300" : "text-red-800"
              }`}
            >
              ⚠️ Missing Prices Detected
            </div>
            <p
              className={`text-sm mb-3 ${
                isDarkMode ? "text-red-400" : "text-red-700"
              }`}
            >
              The following items have inventory data but missing prices for{" "}
              {filters.shop}:
            </p>
            <div className="flex flex-wrap gap-2">
              {itemsWithMissingPrices.map((item) => (
                <span
                  key={item.itemName}
                  className={`px-2 py-1 rounded text-xs ${
                    isDarkMode
                      ? "bg-red-800/50 text-red-300"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.itemName}
                </span>
              ))}
            </div>
            <button
              onClick={() => navigate("/addPrice")}
              className={`mt-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                isDarkMode
                  ? "bg-red-700 hover:bg-red-600"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              Set Prices Now
            </button>
          </section>
        )}

        {/* Inventory Table Section */}
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
              Daily Inventory - {filters.shop} - {filters.date}
            </h2>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Complete inventory view for all {BAKERY_ITEMS.length} bakery items
              {hasUnsavedChanges && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode
                      ? "bg-yellow-900/50 text-yellow-300"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {editedItems.size} unsaved changes
                </span>
              )}
              {totalSalesValue > 0 && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode
                      ? "bg-green-900/50 text-green-300"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  Total Sales: Rs. {totalSalesValue.toFixed(2)}
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
                    className={`px-3 py-3 text-left text-xs font-semibold min-w-[160px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Item Name
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Prev. Day Remaining
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Morning Time
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Evening Time
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Extra In
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Starting Total
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-green-300" : "text-green-700"
                    }`}
                  >
                    Items Sold (Auto)
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-red-300" : "text-red-700"
                    }`}
                  >
                    Transfer Out
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-red-300" : "text-red-700"
                    }`}
                  >
                    Discard
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Remaining
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[70px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Price (Rs.)
                  </th>
                  <th
                    className={`px-2 py-3 text-center text-xs font-semibold min-w-[80px] ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Total Value (Rs.)
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
                    <td colSpan="12" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Loading inventory data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  completeTableData.map((row) => {
                    const hasData =
                      row.morningTime > 0 ||
                      row.eveningTime > 0 ||
                      row.extraIn > 0 ||
                      row.remainingInventory > 0 ||
                      row.transferOut > 0 ||
                      row.discard > 0;
                    const isEdited = editedItems.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors duration-150 ${
                          hasData
                            ? isDarkMode
                              ? "bg-blue-900/20 hover:bg-blue-800/30"
                              : "bg-blue-50/50 hover:bg-blue-100/50"
                            : isDarkMode
                            ? "hover:bg-slate-800/50"
                            : "hover:bg-slate-50"
                        } ${
                          isEdited
                            ? isDarkMode
                              ? "bg-yellow-900/20 border-yellow-700"
                              : "bg-yellow-50 border-yellow-200"
                            : ""
                        }`}
                      >
                        <td
                          className={`px-3 py-2 text-xs font-medium ${
                            isDarkMode ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                hasData
                                  ? "bg-blue-500"
                                  : isEdited
                                  ? "bg-yellow-500"
                                  : isDarkMode
                                  ? "bg-slate-600"
                                  : "bg-slate-300"
                              }`}
                            ></span>
                            <span
                              title={row.itemName}
                              className="truncate max-w-[120px]"
                            >
                              {row.itemName}
                            </span>
                            {row.hasPriceMissing && hasData && (
                              <span
                                className="text-red-500 text-xs"
                                title="Price missing"
                              >
                                ⚠️
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {row.previousDayRemaining}
                          </span>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.morningTime}
                            onChange={(e) =>
                              handleCellEdit(
                                row.id,
                                "morningTime",
                                e.target.value
                              )
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.eveningTime}
                            onChange={(e) =>
                              handleCellEdit(
                                row.id,
                                "eveningTime",
                                e.target.value
                              )
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.extraIn}
                            onChange={(e) =>
                              handleCellEdit(row.id, "extraIn", e.target.value)
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-900/20 text-slate-200"
                                  : "border-yellow-400 bg-yellow-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-800 text-slate-200"
                                : "border-slate-300"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-blue-900/50 text-blue-300"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {row.startingInventory}
                          </span>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              row.selling > 0
                                ? isDarkMode
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-green-100 text-green-800"
                                : isDarkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-100 text-gray-800"
                            }`}
                            title="Auto-calculated: Starting Total - Remaining - Transfer Out - Discard"
                          >
                            {row.selling}
                          </span>
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.transferOut}
                            onChange={(e) =>
                              handleCellEdit(
                                row.id,
                                "transferOut",
                                e.target.value
                              )
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-red-500 bg-red-900/20 text-slate-200"
                                  : "border-red-400 bg-red-50"
                                : isDarkMode
                                ? "border-red-600 bg-red-900/10 text-slate-200"
                                : "border-red-300 bg-red-50/50"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.discard}
                            onChange={(e) =>
                              handleCellEdit(row.id, "discard", e.target.value)
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-red-500 bg-red-900/20 text-slate-200"
                                  : "border-red-400 bg-red-50"
                                : isDarkMode
                                ? "border-red-600 bg-red-900/10 text-slate-200"
                                : "border-red-300 bg-red-50/50"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          <input
                            type="number"
                            value={row.remainingInventory}
                            onChange={(e) =>
                              handleCellEdit(row.id, "remainingInventory", e.target.value)
                            }
                            className={`w-16 text-center border rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                              isEdited
                                ? isDarkMode
                                  ? "border-blue-500 bg-blue-900/20 text-slate-200"
                                  : "border-blue-400 bg-blue-50"
                                : isDarkMode
                                ? "border-blue-600 bg-blue-900/10 text-slate-200"
                                : "border-blue-300 bg-blue-50/50"
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          {row.price !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-purple-900/50 text-purple-300"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {row.price.toFixed(2)}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              Missing
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-2 text-xs text-center">
                          {row.totalValue !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                row.totalValue > 0
                                  ? isDarkMode
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-green-100 text-green-800"
                                  : isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {row.totalValue.toFixed(2)}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              N/A
                            </span>
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

        {/* Quick Summary Section */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 mt-6 transition-colors duration-300 ${
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
            Quick Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                {completeTableData.reduce(
                  (sum, item) => sum + item.startingInventory,
                  0
                )}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Starting Total
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
                {completeTableData.reduce((sum, item) => sum + item.selling, 0)}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Items Sold
              </div>
            </div>
            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-emerald-900/30" : "bg-emerald-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                {completeTableData.reduce(
                  (sum, item) => sum + item.remainingInventory,
                  0
                )}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                Remaining
              </div>
            </div>
            <div
              className={`text-center p-4 rounded-lg border-2 transition-colors duration-300 ${
                isDarkMode
                  ? "bg-green-900/30 border-green-700"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div
                className={`text-xl font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                Rs. {totalSalesValue.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Sales Value
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-opacity-20">
            <button
              onClick={() => navigate("/summary")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              View Detailed Summary
            </button>
            <button
              onClick={() => navigate("/pdf")}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Generate PDF Report
            </button>
            {itemsWithMissingPrices.length > 0 && (
              <button
                onClick={() => navigate("/addPrice")}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Fix Missing Prices ({itemsWithMissingPrices.length})
              </button>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer
          className={`text-center mt-8 py-4 text-sm ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <p>T & S Bakery Inventory Management System</p>
          <p className="mt-1">
            Selected: {filters.shop} | Date: {filters.date} | Items: {BAKERY_ITEMS.length} | Changes: {editedItems.size}
          </p>
        </footer>
      </div>
    </div>
  );
}