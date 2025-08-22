import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import { addDoc, collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "firebase/firestore";

const SHOPS = ["Shop A", "Shop B", "Shop C", "Shop D"];
const BAKERY_ITEMS = [
  "Normal bread", "Sandwich bread", "Half bread", "1/2 rose bread", "1/4 rose bread",
  // "Tea bun", "Dagara bun", "Dot bun", "Cream bun", "Viyana Roll", "Jam bun",
  // "Fish bun", "Sinisambol bun", "Othana Sausages", "Vegetable Bun", "Fish pastry",
  // "Egg Pastry", "Sausages Pastry", "Fish Roll", "Egg Roll", "Vegetable Rotty",
  // "Fish Rotty", "Chicken Pastry", "Wade", "patty -Vegetable", "Patty -fish",
  // "Egg Bun", "Sausages Bun", "Hot dog", "Burger -Chicken", "Burger -Egg Bullseye",
  // "Devel Sausages", "Omlet Bun", "Umbalakada Bun", "Semon Bun", "Fish finger",
  // "Drumstick -Chicken", "Fish Cake", "Egg Pizza", "Sausages Pizza -cheese",
  // "Sandwich -Egg", "Sandwich -fish", "Sandwich -Cheese", "string Hoppers",
  // "Helapa", "Levaria", "Spanchi -Vanila", "Spanchi -Chocolate", "Cup Cake",
  // "Daughnut", "Rock Bun", "Gnanakatha", "Pol Cake", "Swiss Roll", "Butter Cake",
  // "100 Baby crush", "1/4 Side Rosed", "1/2 Side Rosed"
];

export default function SelectionPage() {
  // State management
  const [inventoryData, setInventoryData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editedItems, setEditedItems] = useState(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [bakeryItems, setBakeryItems] = useState([...BAKERY_ITEMS]);
  
  // Filter states
  const [filters, setFilters] = useState({
    shop: SHOPS[0], // Default to first shop
    date: new Date().toISOString().split('T')[0], // Default to today
  });
  
  // UI state
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showPriceManagement, setShowPriceManagement] = useState(false);
  const [editingPrices, setEditingPrices] = useState({});
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  
  // Store current session changes separately
  const [sessionChanges, setSessionChanges] = useState({});
  
  // Firestore collection references - SEPARATE COLLECTIONS
  const inventoryRef = collection(firestore, "inventory");
  const pricesRef = collection(firestore, "prices"); // Separate collection for prices
  
  // Fetch inventory data from Firestore
  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch inventory data from inventory collection
      const inventoryQuery = query(
        inventoryRef, 
        orderBy("createdAt", "desc")
      );
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      const inventoryItems = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch price data from prices collection
      const priceQuery = query(pricesRef);
      const priceSnapshot = await getDocs(priceQuery);
      
      const priceItems = priceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInventoryData(inventoryItems);
      setPriceData(priceItems);
      console.log("Fetched inventory data:", inventoryItems.length, "items");
      console.log("Fetched price data:", priceItems.length, "items");
    } catch (error) {
      console.error("Error fetching data:", error);
      
      // Fallback without ordering
      try {
        const [inventorySnapshot, priceSnapshot] = await Promise.all([
          getDocs(inventoryRef),
          getDocs(pricesRef)
        ]);
        
        const inventoryItems = inventorySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const priceItems = priceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Manual sort by createdAt
        inventoryItems.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        setInventoryData(inventoryItems);
        setPriceData(priceItems);
        console.log("Fetched data (fallback) - inventory:", inventoryItems.length, "prices:", priceItems.length);
      } catch (fallbackError) {
        console.error("Fallback fetch failed:", fallbackError);
        setInventoryData([]);
        setPriceData([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load data on component mount
  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);
  
  // Get price for an item in a specific shop
  const getItemPrice = useCallback((itemName, shop) => {
    const priceRecord = priceData.find(price => 
      price.itemName === itemName && price.shop === shop
    );
    return priceRecord ? parseFloat(priceRecord.price) || 0 : null;
  }, [priceData]);
  
  // Get previous day remaining inventory for an item
  const getPreviousDayRemaining = useCallback((itemName, shop, currentDate) => {
    if (!itemName || !shop || !currentDate) return 0;
    
    const currentDateObj = new Date(currentDate);
    const previousDate = new Date(currentDateObj);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split('T')[0];
    
    const previousDayData = inventoryData.find(item => 
      item.itemName === itemName && 
      item.shop === shop && 
      item.date === previousDateStr
    );
    
    return previousDayData ? (parseInt(previousDayData.remainingInventory) || 0) : 0;
  }, [inventoryData]);
  
  // Create complete table data with all items
  const completeTableData = useMemo(() => {
    const { shop, date } = filters;
    if (!shop || !date) return [];
    
    return bakeryItems.map(itemName => {
      // Find existing data for this item, shop, and date
      const existingData = inventoryData.find(item => 
        item.itemName === itemName && 
        item.shop === shop && 
        item.date === date
      );
      
      // Create a unique key for this item
      const itemKey = `${shop}_${date}_${itemName}`;
      
      // Check if there are session changes for this item
      const sessionChange = sessionChanges[itemKey];
      
      const previousDayRemaining = getPreviousDayRemaining(itemName, shop, date);
      const itemPrice = getItemPrice(itemName, shop);
      
      // Use session changes if available, otherwise use existing data
      const addedInventory = sessionChange 
        ? (parseInt(sessionChange.addedInventory) || 0)
        : (parseInt(existingData?.addedInventory) || 0);
      
      const selling = sessionChange 
        ? (parseInt(sessionChange.selling) || 0)
        : (parseInt(existingData?.selling) || 0);
        
      const startingInventory = previousDayRemaining + addedInventory;
      const remainingInventory = startingInventory - selling;
      
      // Calculate total value (items sold × price)
      const totalValue = itemPrice !== null ? (selling * itemPrice) : null;
      
      return {
        id: itemKey, // Use consistent key
        itemName,
        shop,
        date,
        previousDayRemaining,
        addedInventory,
        startingInventory,
        selling,
        remainingInventory,
        price: itemPrice,
        totalValue,
        isExisting: !!existingData,
        firestoreId: existingData?.id, // Keep track of actual Firestore document ID
        hasChanges: !!sessionChange,
        hasPriceMissing: itemPrice === null
      };
    });
  }, [bakeryItems, inventoryData, filters, getPreviousDayRemaining, sessionChanges, getItemPrice]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear edited items and session changes when filters change
    setEditedItems(new Set());
    setSessionChanges({});
    setHasUnsavedChanges(false);
  }, []);
  
  // Handle cell edit
  const handleCellEdit = useCallback((itemKey, field, value) => {
    const numValue = parseInt(value) || 0;
    
    console.log(`Editing ${field} for item ${itemKey}: ${value}`);
    
    // Find the current item data
    const currentItem = completeTableData.find(item => item.id === itemKey);
    if (!currentItem) return;
    
    // Update session changes
    setSessionChanges(prev => {
      const existing = prev[itemKey] || {};
      const updated = { ...existing };
      
      if (field === 'addedInventory') {
        updated.addedInventory = numValue;
        // Recalculate dependent values
        const selling = parseInt(updated.selling) || 0;
        const startingInventory = currentItem.previousDayRemaining + numValue;
        updated.startingInventory = startingInventory;
        updated.remainingInventory = startingInventory - selling;
      } else if (field === 'selling') {
        updated.selling = numValue;
        // Recalculate remaining inventory
        const addedInventory = parseInt(updated.addedInventory) || parseInt(currentItem.addedInventory) || 0;
        const startingInventory = currentItem.previousDayRemaining + addedInventory;
        updated.startingInventory = startingInventory;
        updated.remainingInventory = startingInventory - numValue;
      }
      
      // Include item details for saving
      updated.itemName = currentItem.itemName;
      updated.shop = currentItem.shop;
      updated.date = currentItem.date;
      updated.previousDayRemaining = currentItem.previousDayRemaining;
      updated.firestoreId = currentItem.firestoreId;
      
      return {
        ...prev,
        [itemKey]: updated
      };
    });
    
    // Mark item as edited
    setEditedItems(prev => new Set([...prev, itemKey]));
    setHasUnsavedChanges(true);
  }, [completeTableData]);
  
  // Handle price editing
  const handlePriceEdit = useCallback((itemName, shop, price) => {
    const priceKey = `${shop}_${itemName}`;
    setEditingPrices(prev => ({
      ...prev,
      [priceKey]: {
        itemName,
        shop,
        price: parseFloat(price) || 0
      }
    }));
  }, []);
  
  // Save price changes - FIXED VERSION
  const handleSavePrices = useCallback(async () => {
    try {
      setPriceSubmitting(true);
      
      const pricesToSave = Object.values(editingPrices);
      console.log("Prices to save:", pricesToSave.length);
      
      if (pricesToSave.length === 0) {
        alert("No price changes detected.");
        return;
      }
      
      const savePromises = pricesToSave.map(async (priceInfo) => {
        try {
          // Check if price record already exists - FIXED: use priceData instead of priceData
          const existingPrice = priceData.find(price => 
            price.itemName === priceInfo.itemName && price.shop === priceInfo.shop
          );
          
          const dataToSave = {
            itemName: priceInfo.itemName,
            shop: priceInfo.shop,
            price: priceInfo.price,
            updatedAt: new Date().toISOString()
          };
          
          if (existingPrice) {
            // Update existing price record
            console.log(`Updating price for ${priceInfo.itemName} in ${priceInfo.shop}: Rs.${priceInfo.price}`);
            const docRef = doc(firestore, "prices", existingPrice.id);
            await updateDoc(docRef, dataToSave);
          } else {
            // Create new price record
            console.log(`Creating new price for ${priceInfo.itemName} in ${priceInfo.shop}: Rs.${priceInfo.price}`);
            await addDoc(pricesRef, {
              ...dataToSave,
              createdAt: new Date().toISOString()
            });
          }
        } catch (itemError) {
          console.error(`Error saving price for ${priceInfo.itemName}:`, itemError);
          throw itemError;
        }
      });
      
      await Promise.all(savePromises);
      
      // Clear editing state
      setEditingPrices({});
      
      // Refresh data
      await fetchInventoryData();
      
      //alert(`Successfully saved ${pricesToSave.length} price updates!`);
    } catch (error) {
      console.error("Error saving prices:", error);
      const errorMessage = error.code === 'permission-denied' 
        ? "Permission denied. Please check your Firebase permissions for the 'prices' collection."
        : error.code === 'unavailable'
        ? "Firebase service temporarily unavailable. Please try again."
        : `Failed to save prices: ${error.message}`;
      alert(errorMessage);
    } finally {
      setPriceSubmitting(false);
    }
  }, [editingPrices, priceData, fetchInventoryData]);
  
  // Save changes to Firebase
  const handleSaveChanges = useCallback(async () => {
    try {
      setSubmitting(true);
      
      const itemsToSave = Object.entries(sessionChanges).filter(([itemKey, changes]) => {
        const hasAddedInventory = (parseInt(changes.addedInventory) || 0) > 0;
        const hasSelling = (parseInt(changes.selling) || 0) > 0;
        const isEdited = editedItems.has(itemKey);
        
        return isEdited && (hasAddedInventory || hasSelling);
      });
      
      console.log("Items to save:", itemsToSave.length);
      
      if (itemsToSave.length === 0) {
        alert("No changes detected to save. Please enter some inventory data first.");
        return;
      }
      
      const savePromises = itemsToSave.map(async ([itemKey, changes]) => {
        try {
          const dataToSave = {
            date: changes.date,
            shop: changes.shop,
            itemName: changes.itemName,
            previousDayRemaining: parseInt(changes.previousDayRemaining) || 0,
            addedInventory: parseInt(changes.addedInventory) || 0,
            startingInventory: parseInt(changes.startingInventory) || 0,
            selling: parseInt(changes.selling) || 0,
            remainingInventory: parseInt(changes.remainingInventory) || 0,
            updatedAt: new Date().toISOString()
          };
          
          if (changes.firestoreId) {
            // Update existing document
            console.log("Updating existing item:", changes.itemName, "with ID:", changes.firestoreId);
            const docRef = doc(firestore, "inventory", changes.firestoreId);
            await updateDoc(docRef, dataToSave);
          } else {
            // Create new document
            console.log("Creating new item:", changes.itemName);
            await addDoc(inventoryRef, {
              ...dataToSave,
              createdAt: new Date().toISOString()
            });
          }
        } catch (itemError) {
          console.error(`Error saving item ${changes.itemName}:`, itemError);
          throw itemError;
        }
      });
      
      await Promise.all(savePromises);
      
      // Clear session state
      setEditedItems(new Set());
      setSessionChanges({});
      setHasUnsavedChanges(false);
      
      // Refresh data
      await fetchInventoryData();
      
      //alert(`Successfully saved ${itemsToSave.length} items!`);
    } catch (error) {
      console.error("Error saving changes:", error);
      const errorMessage = error.code === 'permission-denied' 
        ? "Permission denied. Please check your Firebase permissions."
        : error.code === 'unavailable'
        ? "Firebase service temporarily unavailable. Please try again."
        : `Failed to save changes: ${error.message}`;
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [sessionChanges, editedItems, fetchInventoryData]);
  
  // Add new bakery item
  const handleAddNewItem = useCallback(() => {
    if (newItemName.trim() && !bakeryItems.includes(newItemName.trim())) {
      setBakeryItems(prev => [...prev, newItemName.trim()]);
      setNewItemName("");
      setShowNewItemForm(false);
      alert("New item added successfully!");
    } else if (bakeryItems.includes(newItemName.trim())) {
      alert("This item already exists!");
    } else {
      alert("Please enter a valid item name.");
    }
  }, [newItemName, bakeryItems]);
  
  // Navigate to different date
  const navigateDate = useCallback((days) => {
    const currentDate = new Date(filters.date);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    handleFilterChange('date', newDate.toISOString().split('T')[0]);
  }, [filters.date, handleFilterChange]);
  
  // Calculate total sales value
  const totalSalesValue = useMemo(() => {
    return completeTableData.reduce((sum, item) => {
      return sum + (item.totalValue || 0);
    }, 0);
  }, [completeTableData]);
  
  // Get items with missing prices
  const itemsWithMissingPrices = useMemo(() => {
    return completeTableData.filter(item => item.hasPriceMissing && (item.addedInventory > 0 || item.selling > 0));
  }, [completeTableData]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-full">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            T & S Bakery Inventory
          </h1>
          <p className="text-slate-600 text-lg">Complete daily inventory tracking with pricing for all bakery items</p>
          <div className="mt-2 text-sm text-slate-500">
            📊 Inventory Collection | 💰 Prices Collection (Separate)
          </div>
        </header>

        {/* Filters Section */}
        <section className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            🔍 Select Shop & Date
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="shop-filter" className="block text-sm font-medium text-slate-700 mb-2">
                Select Shop:
              </label>
              <select 
                id="shop-filter"
                value={filters.shop} 
                onChange={(e) => handleFilterChange('shop', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {SHOPS.map((shop) => (
                  <option key={shop} value={shop}>{shop}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-slate-700 mb-2">
                Select Date:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateDate(-1)}
                  className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 transition-colors"
                  title="Previous day"
                >
                  ←
                </button>
                <input
                  id="date-filter"
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  onClick={() => navigateDate(1)}
                  className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 transition-colors"
                  title="Next day"
                >
                  →
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('date', new Date().toISOString().split('T')[0])}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
              >
                Today
              </button>
              <button
                onClick={() => setShowPriceManagement(!showPriceManagement)}
                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
              >
                💰 Prices
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 text-sm"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Price Management Section */}
        {showPriceManagement && (
          <section className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                💰 Price Management - {filters.shop} 
                <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  Prices Collection
                </span>
              </h2>
              <div className="flex gap-2">
                {Object.keys(editingPrices).length > 0 && (
                  <button
                    onClick={handleSavePrices}
                    disabled={priceSubmitting}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 text-sm"
                  >
                    {priceSubmitting ? "Saving..." : `Save ${Object.keys(editingPrices).length} Price(s)`}
                  </button>
                )}
                <button
                  onClick={() => setShowPriceManagement(false)}
                  className="bg-slate-500 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {bakeryItems.map(itemName => {
                const currentPrice = getItemPrice(itemName, filters.shop);
                const priceKey = `${filters.shop}_${itemName}`;
                const editingPrice = editingPrices[priceKey];
                const displayPrice = editingPrice ? editingPrice.price : currentPrice;
                
                return (
                  <div key={itemName} className="bg-white rounded-lg border border-slate-200 p-3">
                    <div className="font-medium text-sm text-slate-800 mb-2 truncate" title={itemName}>
                      {itemName}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Rs.</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={displayPrice || ''}
                        onChange={(e) => handlePriceEdit(itemName, filters.shop, e.target.value)}
                        className={`flex-1 text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          currentPrice === null ? 'border-red-300 bg-red-50' : 'border-slate-300'
                        } ${editingPrice ? 'border-purple-400 bg-purple-50' : ''}`}
                        placeholder="0.00"
                      />
                      {currentPrice === null && (
                        <span className="text-red-500 text-xs" title="Price missing">
                          ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Add New Item Section */}
        <section className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              ➕ Manage Items
            </h2>
            <button
              onClick={() => setShowNewItemForm(!showNewItemForm)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 text-sm"
            >
              {showNewItemForm ? "Cancel" : "Add New Item"}
            </button>
          </div>
          
          {showNewItemForm && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Item Name:
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter new bakery item name"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAddNewItem}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add Item
              </button>
            </div>
          )}
        </section>

        {/* Missing Prices Alert */}
        {itemsWithMissingPrices.length > 0 && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              ⚠️ Missing Prices Detected
            </div>
            <p className="text-red-700 text-sm mb-3">
              The following items have inventory data but missing prices for {filters.shop}:
            </p>
            <div className="flex flex-wrap gap-2">
              {itemsWithMissingPrices.map(item => (
                <span key={item.itemName} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                  {item.itemName}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowPriceManagement(true)}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Set Prices Now
            </button>
          </section>
        )}

        {/* Inventory Table Section */}
        <section className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              📊 Daily Inventory - {filters.shop} - {filters.date}
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Inventory Collection
              </span>
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Complete inventory view for all {bakeryItems.length} bakery items
              {hasUnsavedChanges && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {editedItems.size} unsaved changes
                </span>
              )}
              {totalSalesValue > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Total Sales: Rs. {totalSalesValue.toFixed(2)}
                </span>
              )}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700 min-w-[200px]">
                    Item Name
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[120px]">
                    Previous Day<br/>Remaining
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[120px]">
                    Added<br/>Inventory
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[120px]">
                    Starting<br/>Total
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[120px]">
                    Items<br/>Sold
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[120px]">
                    Remaining<br/>Inventory
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[100px]">
                    Price<br/>(Rs.)
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 min-w-[120px]">
                    Total Value<br/>(Rs.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-slate-500 text-lg font-medium">Loading inventory data...</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  completeTableData.map((row, index) => {
                    const hasData = row.addedInventory > 0 || row.selling > 0;
                    const isEdited = editedItems.has(row.id);
                    
                    return (
                      <tr 
                        key={row.id} 
                        className={`transition-colors duration-150 ${
                          hasData ? 'bg-blue-50/50 hover:bg-blue-100/50' : 'hover:bg-slate-50'
                        } ${isEdited ? 'bg-yellow-50 border-yellow-200' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              hasData ? 'bg-blue-500' : 
                              isEdited ? 'bg-yellow-500' :
                              'bg-slate-300'
                            }`}></span>
                            <span title={row.itemName} className="truncate">
                              {row.itemName}
                            </span>
                            {row.hasPriceMissing && hasData && (
                              <span className="text-red-500 text-xs" title="Price missing">
                                ⚠️
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {row.previousDayRemaining}
                          </span>
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          <input
                            type="number"
                            value={row.addedInventory}
                            onChange={(e) => handleCellEdit(row.id, 'addedInventory', e.target.value)}
                            className={`w-20 text-center border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              isEdited 
                                ? 'border-yellow-400 bg-yellow-50' 
                                : 'border-slate-300'
                            }`}
                            min="0"
                            placeholder="0"
                          />
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {row.startingInventory}
                          </span>
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          <input
                            type="number"
                            value={row.selling}
                            onChange={(e) => handleCellEdit(row.id, 'selling', e.target.value)}
                            className={`w-20 text-center border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              isEdited 
                                ? 'border-yellow-400 bg-yellow-50' 
                                : 'border-slate-300'
                            }`}
                            min="0"
                            max={row.startingInventory}
                            placeholder="0"
                          />
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.remainingInventory > 0 ? 'bg-emerald-100 text-emerald-800' : 
                            row.remainingInventory === 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.remainingInventory}
                          </span>
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          {row.price !== null ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {row.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Missing
                            </span>
                          )}
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-center">
                          {row.totalValue !== null ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.totalValue > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.totalValue.toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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

        {/* Summary Section */}
        <section className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            📈 Daily Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {completeTableData.reduce((sum, item) => sum + item.addedInventory, 0)}
              </div>
              <div className="text-sm text-blue-700">Total Added</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {completeTableData.reduce((sum, item) => sum + item.startingInventory, 0)}
              </div>
              <div className="text-sm text-purple-700">Total Starting</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {completeTableData.reduce((sum, item) => sum + item.selling, 0)}
              </div>
              <div className="text-sm text-orange-700">Total Sold</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">
                {completeTableData.reduce((sum, item) => sum + item.remainingInventory, 0)}
              </div>
              <div className="text-sm text-emerald-700">Total Remaining</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-2xl font-bold text-green-600">
                Rs. {totalSalesValue.toFixed(2)}
              </div>
              <div className="text-sm text-green-700 font-medium">Total Sales Value</div>
            </div>
          </div>
          
          {/* Price Coverage Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-lg font-bold text-slate-700">
                {priceData.filter(p => p.shop === filters.shop).length} / {bakeryItems.length}
              </div>
              <div className="text-sm text-slate-600">Items with Prices</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {itemsWithMissingPrices.length}
              </div>
              <div className="text-sm text-red-700">Active Items Missing Prices</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {completeTableData.filter(item => item.totalValue !== null && item.totalValue > 0).length}
              </div>
              <div className="text-sm text-blue-700">Items Contributing to Sales</div>
            </div>
          </div>
          
          {/* Database Status */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
            <h3 className="text-md font-semibold text-indigo-800 mb-2 flex items-center gap-2">
              🗄️ Database Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/70 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-medium">📊 Inventory Collection:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {inventoryData.length} records
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Daily inventory tracking data
                </div>
              </div>
              <div className="bg-white/70 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-purple-700 font-medium">💰 Prices Collection:</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    {priceData.length} records
                  </span>
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Item pricing data per shop
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}