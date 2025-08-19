import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import { addDoc, collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

const SHOPS = ["Shop A", "Shop B", "Shop C", "Shop D"];
const BAKERY_ITEMS = [
  "Normal bread", "Sandwich bread", "Half bread", "1/2 rose bread", "1/4 rose bread",
  "Tea bun", "Dagara bun", "Dot bun", "Cream bun", "Viyana Roll", "Jam bun",
  "Fish bun", "Sinisambol bun", "Othana Sausages", "Vegetable Bun", "Fish pastry",
  "Egg Pastry", "Sausages Pastry", "Fish Roll", "Egg Roll", "Vegetable Rotty",
  "Fish Rotty", "Chicken Pastry", "Wade", "patty -Vegetable", "Patty -fish",
  "Egg Bun", "Sausages Bun", "Hot dog", "Burger -Chicken", "Burger -Egg Bullseye",
  "Devel Sausages", "Omlet Bun", "Umbalakada Bun", "Semon Bun", "Fish finger",
  "Drumstick -Chicken", "Fish Cake", "Egg Pizza", "Sausages Pizza -cheese",
  "Sandwich -Egg", "Sandwich -fish", "Sandwich -Cheese", "string Hoppers",
  "Helapa", "Levaria", "Spanchi -Vanila", "Spanchi -Chocolate", "Cup Cake",
  "Daughnut", "Rock Bun", "Gnanakatha", "Pol Cake", "Swiss Roll", "Butter Cake",
  "100 Baby crush", "1/4 Side Rosed", "1/2 Side Rosed"
];

export default function SelectionPage() {
  // State management
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingRows, setEditingRows] = useState(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [bakeryItems, setBakeryItems] = useState([...BAKERY_ITEMS]);
  
  // Filter states
  const [filters, setFilters] = useState({
    shop: "",
    date: "",
  });
  
  // Form states
  const [formData, setFormData] = useState({
    selectedItem: "",
    addedInventory: "",
    selling: "",
  });
  
  // UI state
  const [showSlidePanel, setShowSlidePanel] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  // Firestore collection reference
  const inventoryRef = collection(firestore, "inventory");
  
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
    
    return previousDayData ? (previousDayData.remainingInventory || 0) : 0;
  }, [inventoryData]);
  
  // Calculate starting inventory (previous day remaining + added inventory)
  const calculatedStartingInventory = useMemo(() => {
    if (!filters.shop || !filters.date || !formData.selectedItem) return 0;
    
    const previousDayRemaining = getPreviousDayRemaining(
      formData.selectedItem,
      filters.shop,
      filters.date
    );
    const addedInventory = parseInt(formData.addedInventory) || 0;
    return previousDayRemaining + addedInventory;
  }, [formData.selectedItem, formData.addedInventory, filters.shop, filters.date, getPreviousDayRemaining]);
  
  // Auto-calculate remaining inventory
  const calculatedRemainingInventory = useMemo(() => {
    const selling = parseInt(formData.selling) || 0;
    return calculatedStartingInventory - selling;
  }, [calculatedStartingInventory, formData.selling]);
  
  // Validation for form
  const isFormValid = useMemo(() => {
    return (
      filters.shop &&
      filters.date &&
      formData.selectedItem &&
      (formData.addedInventory !== "" && formData.addedInventory !== null) &&
      formData.selling &&
      calculatedRemainingInventory >= 0
    );
  }, [filters, formData, calculatedRemainingInventory]);
  
  // Fetch inventory data from Firestore
  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(inventoryRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInventoryData(data);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      
      // Fallback without ordering
      try {
        const querySnapshot = await getDocs(inventoryRef);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Manual sort by createdAt
        data.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        setInventoryData(data);
      } catch (fallbackError) {
        console.error("Fallback fetch failed:", fallbackError);
        setInventoryData([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load data on component mount
  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);
  
  // Filter data based on selected criteria
  const filteredData = useMemo(() => {
    return inventoryData.filter(item => {
      const shopMatch = !filters.shop || item.shop === filters.shop;
      const dateMatch = !filters.date || item.date === filters.date;
      return shopMatch && dateMatch;
    }).map(item => {
      // Add previous day remaining calculation for display
      const previousDayRemaining = getPreviousDayRemaining(item.itemName, item.shop, item.date);
      return {
        ...item,
        previousDayRemaining,
        // Ensure we have the correct starting inventory
        calculatedStartingInventory: previousDayRemaining + (parseInt(item.addedInventory) || 0)
      };
    });
  }, [inventoryData, filters, getPreviousDayRemaining]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  // Handle form input changes
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  // Reset form data
  const resetForm = useCallback(() => {
    setFormData({
      selectedItem: "",
      addedInventory: "",
      selling: "",
    });
  }, []);
  
  // Handle table cell edit
  const handleCellEdit = useCallback((rowId, field, value) => {
    setInventoryData(prevData => 
      prevData.map(item => {
        if (item.id === rowId) {
          const updatedItem = { ...item };
          
          if (field === 'addedInventory') {
            const addedInventory = parseInt(value) || 0;
            const previousDayRemaining = getPreviousDayRemaining(item.itemName, item.shop, item.date);
            updatedItem.addedInventory = addedInventory;
            updatedItem.startingInventory = previousDayRemaining + addedInventory;
            updatedItem.remainingInventory = updatedItem.startingInventory - (parseInt(item.selling) || 0);
          } else if (field === 'selling') {
            const selling = parseInt(value) || 0;
            updatedItem.selling = selling;
            updatedItem.remainingInventory = (item.startingInventory || 0) - selling;
          } else {
            updatedItem[field] = value;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
    
    setEditingRows(prev => new Set([...prev, rowId]));
    setHasUnsavedChanges(true);
  }, [getPreviousDayRemaining]);
  
  // Save changes to Firebase
  const handleSaveChanges = useCallback(async () => {
    try {
      setSubmitting(true);
      
      const updatePromises = Array.from(editingRows).map(async (rowId) => {
        const item = inventoryData.find(item => item.id === rowId);
        if (item) {
          const docRef = doc(firestore, "inventory", rowId);
          await updateDoc(docRef, {
            addedInventory: parseInt(item.addedInventory) || 0,
            startingInventory: item.startingInventory || 0,
            selling: parseInt(item.selling) || 0,
            remainingInventory: item.remainingInventory || 0,
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      await Promise.all(updatePromises);
      
      setEditingRows(new Set());
      setHasUnsavedChanges(false);
      await fetchInventoryData();
      
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [editingRows, inventoryData, fetchInventoryData]);
  
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
  
  // Add new inventory item
  const handleAddItem = useCallback(async () => {
    if (!isFormValid) {
      alert("Please fill in all required fields correctly");
      return;
    }
    
    if (calculatedRemainingInventory < 0) {
      alert("Selling quantity cannot exceed starting inventory!");
      return;
    }
    
    const previousDayRemaining = getPreviousDayRemaining(
      formData.selectedItem,
      filters.shop,
      filters.date
    );
    
    const inventoryItem = {
      date: filters.date,
      shop: filters.shop,
      itemName: formData.selectedItem,
      previousDayRemaining: previousDayRemaining,
      addedInventory: parseInt(formData.addedInventory) || 0,
      startingInventory: calculatedStartingInventory,
      selling: parseInt(formData.selling) || 0,
      remainingInventory: calculatedRemainingInventory,
      createdAt: new Date().toISOString(),
    };
    
    try {
      setSubmitting(true);
      
      await addDoc(inventoryRef, inventoryItem);
      
      // Reset form and close panel
      resetForm();
      setShowSlidePanel(false);
      
      // Refresh data
      await fetchInventoryData();
      
    } catch (error) {
      console.error("Error adding inventory item:", error);
      
      const errorMessage = error.code === 'permission-denied' 
        ? "Permission denied. Please check your Firestore rules."
        : error.code === 'unavailable'
        ? "Service temporarily unavailable. Please try again."
        : `Failed to add item: ${error.message}`;
        
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, calculatedRemainingInventory, calculatedStartingInventory, filters, formData, resetForm, fetchInventoryData, getPreviousDayRemaining]);
  
  // Toggle slide panel
  const togglePanel = useCallback(() => {
    setShowSlidePanel(prev => !prev);
    if (showSlidePanel) {
      resetForm();
    }
  }, [showSlidePanel, resetForm]);
  
  // Delete inventory item
  const handleDeleteItem = useCallback(async (itemId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteDoc(doc(firestore, "inventory", itemId));
        await fetchInventoryData();
        alert("Item deleted successfully!");
      } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item. Please try again.");
      }
    }
  }, [fetchInventoryData]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            T & S Bakery Inventory
          </h1>
          <p className="text-slate-600 text-lg">Track and manage your bakery items across all locations</p>
        </header>

        {/* Filters Section */}
        <section className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            🔍 Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="">All Shops</option>
                {SHOPS.map((shop) => (
                  <option key={shop} value={shop}>{shop}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-slate-700 mb-2">
                Select Date:
              </label>
              <input
                id="date-filter"
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        </section>

        {/* Inventory Table Section */}
        <section className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                📊 Inventory Data
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {loading ? "Loading..." : `${filteredData.length} record(s) found`}
                {filters.shop && ` for ${filters.shop}`}
                {filters.date && ` on ${filters.date}`}
              </p>
            </div>
            
            <div className="flex gap-3">
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-lg">💾</span>
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
              )}
              
              <button
                onClick={togglePanel}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg">+</span>
                <span>Add New Item</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Shop</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Item Name</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Previous Day<br/>Remaining</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Added<br/>Inventory</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Starting<br/>Total</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Items<br/>Sold</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Remaining</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-slate-500 text-lg font-medium">Loading inventory data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4 text-sm text-slate-600">{row.date}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {row.shop}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-800 max-w-xs">
                        <div className="truncate" title={row.itemName}>
                          {row.itemName}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {row.previousDayRemaining || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <input
                          type="number"
                          value={row.addedInventory || 0}
                          onChange={(e) => handleCellEdit(row.id, 'addedInventory', e.target.value)}
                          className="w-20 text-center border border-slate-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {row.startingInventory || ((row.previousDayRemaining || 0) + (parseInt(row.addedInventory) || 0))}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <input
                          type="number"
                          value={row.selling || 0}
                          onChange={(e) => handleCellEdit(row.id, 'selling', e.target.value)}
                          className="w-20 text-center border border-slate-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          max={row.startingInventory || 999}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (row.remainingInventory || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 
                          (row.remainingInventory || 0) === 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {row.remainingInventory || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <button
                          onClick={() => handleDeleteItem(row.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors duration-150"
                          title="Delete item"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-4xl mb-4">📦</span>
                        <p className="text-slate-500 text-lg font-medium mb-2">No inventory records found</p>
                        {(filters.shop || filters.date) && (
                          <p className="text-slate-400 text-sm">
                            Try changing your filter selection or add new items
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Slide Panel */}
        <>
          {/* Overlay */}
          {showSlidePanel && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={togglePanel}
            />
          )}
          
          {/* Panel */}
          <aside className={`fixed top-0 right-0 h-full w-96 max-w-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
            showSlidePanel ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="p-6 h-full overflow-y-auto">
              <header className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    ➕ Add New Item
                  </h2>
                  <p className="text-slate-600 text-sm">Fill out the form below to add inventory</p>
                </div>
                <button
                  onClick={togglePanel}
                  className="text-slate-400 hover:text-slate-600 text-2xl p-1 rounded-lg hover:bg-slate-100 transition-colors duration-150"
                  aria-label="Close panel"
                >
                  ×
                </button>
              </header>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* Item Selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="item-select" className="block text-sm font-medium text-slate-700">
                      Select Item:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewItemForm(!showNewItemForm)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + New Item
                    </button>
                  </div>
                  
                  {showNewItemForm && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Enter new item name"
                          className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewItem}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewItemForm(false);
                            setNewItemName("");
                          }}
                          className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <select
                    id="item-select"
                    value={formData.selectedItem}
                    onChange={(e) => handleFormChange('selectedItem', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Choose an item...</option>
                    {bakeryItems.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                {/* Previous Day Remaining (Read-only) */}
                {formData.selectedItem && filters.shop && filters.date && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Previous Day Remaining:
                    </label>
                    <div className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 border-gray-300 text-gray-700">
                      {getPreviousDayRemaining(formData.selectedItem, filters.shop, filters.date)}
                    </div>
                  </div>
                )}

                {/* Added Inventory */}
                <div>
                  <label htmlFor="added-inventory" className="block text-sm font-medium text-slate-700 mb-2">
                    Added Inventory (New Stock):
                  </label>
                  <input
                    id="added-inventory"
                    type="number"
                    value={formData.addedInventory}
                    onChange={(e) => handleFormChange('addedInventory', e.target.value)}
                    placeholder="Enter new stock quantity"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    min="0"
                    required
                  />
                </div>

                {/* Starting Total (Auto-calculated) */}
                {formData.selectedItem && filters.shop && filters.date && formData.addedInventory !== "" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Starting Total (Auto-calculated):
                    </label>
                    <div className="w-full border rounded-lg px-3 py-2.5 bg-blue-50 border-blue-300 text-blue-800 font-medium">
                      {calculatedStartingInventory}
                    </div>
                  </div>
                )}

                {/* Items Sold */}
                <div>
                  <label htmlFor="items-sold" className="block text-sm font-medium text-slate-700 mb-2">
                    Items Sold:
                  </label>
                  <input
                    id="items-sold"
                    type="number"
                    value={formData.selling}
                    onChange={(e) => handleFormChange('selling', e.target.value)}
                    placeholder="Enter sold quantity"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    min="0"
                    max={calculatedStartingInventory || undefined}
                    required
                  />
                </div>

                {/* Auto-calculated Remaining Inventory */}
                {formData.addedInventory !== "" && formData.selling && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Remaining Inventory (Auto-calculated):
                    </label>
                    <div className={`w-full border rounded-lg px-3 py-2.5 font-medium ${
                      calculatedRemainingInventory >= 0 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}>
                      {calculatedRemainingInventory >= 0 
                        ? calculatedRemainingInventory
                        : "⚠️ Selling exceeds starting inventory"}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!isFormValid || submitting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="mr-2">
                    {submitting ? "⏳" : "✨"}
                  </span>
                  {submitting ? "Adding Item..." : "Add Item to Inventory"}
                </button>
              </form>

              {/* Status Messages */}
              {filters.shop && filters.date && formData.selectedItem && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-lg">📍</span>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Ready to add:</p>
                      <p className="text-sm text-blue-600">
                        <strong>{formData.selectedItem}</strong> at <strong>{filters.shop}</strong> on <strong>{filters.date}</strong>
                      </p>
                      {formData.selectedItem && (
                        <p className="text-xs text-blue-500 mt-1">
                          Previous day remaining: {getPreviousDayRemaining(formData.selectedItem, filters.shop, filters.date)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(!filters.shop || !filters.date) && (
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-lg">⚠️</span>
                    <div>
                      <p className="text-sm text-amber-700 font-medium">Action Required:</p>
                      <p className="text-sm text-amber-600">
                        Please select both shop and date from the filters above before adding items.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  💡 Tips
                </h3>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Starting total = Previous day remaining + Added inventory</li>
                  <li>• Remaining inventory is automatically calculated</li>
                  <li>• Cannot sell more than starting total</li>
                  <li>• All fields are required for submission</li>
                  <li>• Use "New Item" button to add custom bakery items</li>
                  <li>• Edit values directly in the table and click Save Changes</li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  ⚡ Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleFilterChange('date', today);
                    }}
                    className="w-full text-left text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 p-2 rounded transition-colors"
                  >
                    📅 Set today's date
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (filters.date) {
                        const currentDate = new Date(filters.date);
                        const nextDay = new Date(currentDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        handleFilterChange('date', nextDay.toISOString().split('T')[0]);
                      }
                    }}
                    disabled={!filters.date}
                    className="w-full text-left text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ➡️ Move to next day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (filters.date) {
                        const currentDate = new Date(filters.date);
                        const prevDay = new Date(currentDate);
                        prevDay.setDate(prevDay.getDate() - 1);
                        handleFilterChange('date', prevDay.toISOString().split('T')[0]);
                      }
                    }}
                    disabled={!filters.date}
                    className="w-full text-left text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ⬅️ Move to previous day
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      </div>
    </div>
  );
}