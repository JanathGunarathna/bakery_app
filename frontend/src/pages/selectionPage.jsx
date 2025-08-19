import React, { useState } from "react";

export default function SelectionPage() {
  const shops = ["Shop A", "Shop B", "Shop C", "Shop D"];

  // Sample inventory data
  const [inventoryData, setInventoryData] = useState([
    { date: "2025-08-10", shop: "Shop A", itemName: "Croissant", startingInventory: 100, selling: 25, remainingInventory: 75 },
    { date: "2025-08-10", shop: "Shop A", itemName: "Baguette", startingInventory: 80, selling: 15, remainingInventory: 65 },
    { date: "2025-08-12", shop: "Shop B", itemName: "Danish Pastry", startingInventory: 150, selling: 30, remainingInventory: 120 },
    { date: "2025-08-12", shop: "Shop B", itemName: "Croissant", startingInventory: 90, selling: 20, remainingInventory: 70 },
    { date: "2025-08-13", shop: "Shop C", itemName: "Muffin", startingInventory: 60, selling: 10, remainingInventory: 50 },
    { date: "2025-08-13", shop: "Shop C", itemName: "Sourdough", startingInventory: 75, selling: 18, remainingInventory: 57 },
    { date: "2025-08-15", shop: "Shop D", itemName: "Cupcake", startingInventory: 200, selling: 45, remainingInventory: 155 },
    { date: "2025-08-17", shop: "Shop A", itemName: "Croissant", startingInventory: 120, selling: 35, remainingInventory: 85 },
  ]);

  // Filter states
  const [selectedShop, setSelectedShop] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    itemName: "",
    startingInventory: "",
    selling: "",
    remainingInventory: ""
  });

  // Panel state
  const [showSlidePanel, setShowSlidePanel] = useState(false);

  const handleShopChange = (e) => {
    setSelectedShop(e.target.value);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = () => {
    if (!selectedShop || !selectedDate || !formData.itemName || !formData.startingInventory || !formData.selling || !formData.remainingInventory) {
      alert("Please fill in all fields and select shop and date");
      return;
    }

    const newItem = {
      date: selectedDate,
      shop: selectedShop,
      itemName: formData.itemName,
      startingInventory: parseInt(formData.startingInventory),
      selling: parseInt(formData.selling),
      remainingInventory: parseInt(formData.remainingInventory)
    };

    setInventoryData(prev => [...prev, newItem]);
    
    // Reset form
    setFormData({
      itemName: "",
      startingInventory: "",
      selling: "",
      remainingInventory: ""
    });

    // Close slide panel
    setShowSlidePanel(false);
    
    // Show success message
    alert("Item added successfully!");
  };

  const togglePanel = () => {
    setShowSlidePanel(!showSlidePanel);
  };

  // Filter data based on selected shop and date
  const filteredData = inventoryData.filter((item) => {
    const shopMatch = !selectedShop || item.shop === selectedShop;
    const dateMatch = !selectedDate || item.date === selectedDate;
    return shopMatch && dateMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            T & S Bakery Inventory
          </h1>
          <p className="text-slate-600 text-lg">Track and manage your bakery items across all locations</p>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            🔍 Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Shop:</label>
              <select 
                value={selectedShop} 
                onChange={handleShopChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Shops</option>
                {shops.map((shop, index) => (
                  <option key={index} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                📊 Inventory Data
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {filteredData.length} record(s) found
                {selectedShop && ` for ${selectedShop}`}
                {selectedDate && ` on ${selectedDate}`}
              </p>
            </div>
            
            {/* Add Button */}
            <button
              onClick={togglePanel}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <span className="text-lg">+</span>
              <span>Add New Item</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Shop</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Item Name</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Starting</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Selling</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm text-slate-600">{row.date}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {row.shop}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{row.itemName}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {row.startingInventory}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          -{row.selling}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {row.remainingInventory}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-4xl mb-4">📦</span>
                        <p className="text-slate-500 text-lg font-medium mb-2">No inventory records found</p>
                        {(selectedShop || selectedDate) && (
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
        </div>

        {/* Slide-In Panel */}
        <>
          {/* Overlay */}
          {showSlidePanel && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
              onClick={togglePanel}
            ></div>
          )}
          
          {/* Slide Panel */}
          <div className={`fixed top-0 right-0 h-full w-96 max-w-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
            showSlidePanel ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    ➕ Add New Item
                  </h2>
                  <p className="text-slate-600 text-sm">Fill out the form below to add inventory</p>
                </div>
                <button
                  onClick={togglePanel}
                  className="text-slate-400 hover:text-slate-600 text-2xl p-1 rounded-lg hover:bg-slate-100 transition-colors duration-150"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Item Name:</label>
                  <input
                    type="text"
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleFormChange}
                    placeholder="e.g., Croissant, Muffin, Baguette"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Starting Inventory:</label>
                  <input
                    type="number"
                    name="startingInventory"
                    value={formData.startingInventory}
                    onChange={handleFormChange}
                    placeholder="Enter starting quantity"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Items Sold:</label>
                  <input
                    type="number"
                    name="selling"
                    value={formData.selling}
                    onChange={handleFormChange}
                    placeholder="Enter sold quantity"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Remaining Inventory:</label>
                  <input
                    type="number"
                    name="remainingInventory"
                    value={formData.remainingInventory}
                    onChange={handleFormChange}
                    placeholder="Enter remaining quantity"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    min="0"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
                >
                  <span className="mr-2">✨</span>
                  Add Item to Inventory
                </button>
              </div>

              {/* Status Messages */}
              {selectedShop && selectedDate && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-lg">📍</span>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Ready to add item:</p>
                      <p className="text-sm text-blue-600">
                        <strong>{selectedShop}</strong> on <strong>{selectedDate}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(!selectedShop || !selectedDate) && (
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

              {/* Quick Tips */}
              <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  💡 Quick Tips
                </h3>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Ensure remaining = starting - selling</li>
                  <li>• Use clear, descriptive item names</li>
                  <li>• Double-check quantities before submitting</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}

// import React, { useState } from "react";

// export default function SelectionPage() {
//   const shops = ["Shop A", "Shop B", "Shop C", "Shop D"];

//   // Sample inventory data
//   const [inventoryData, setInventoryData] = useState([
//     { date: "2025-08-10", shop: "Shop A", itemName: "Croissant", startingInventory: 100, selling: 25, remainingInventory: 75 },
//     { date: "2025-08-10", shop: "Shop A", itemName: "Baguette", startingInventory: 80, selling: 15, remainingInventory: 65 },
//     { date: "2025-08-12", shop: "Shop B", itemName: "Danish Pastry", startingInventory: 150, selling: 30, remainingInventory: 120 },
//     { date: "2025-08-12", shop: "Shop B", itemName: "Croissant", startingInventory: 90, selling: 20, remainingInventory: 70 },
//     { date: "2025-08-13", shop: "Shop C", itemName: "Muffin", startingInventory: 60, selling: 10, remainingInventory: 50 },
//     { date: "2025-08-13", shop: "Shop C", itemName: "Sourdough", startingInventory: 75, selling: 18, remainingInventory: 57 },
//     { date: "2025-08-15", shop: "Shop D", itemName: "Cupcake", startingInventory: 200, selling: 45, remainingInventory: 155 },
//     { date: "2025-08-17", shop: "Shop A", itemName: "Croissant", startingInventory: 120, selling: 35, remainingInventory: 85 },
//   ]);

//   // Filter states
//   const [selectedShop, setSelectedShop] = useState("");
//   const [selectedDate, setSelectedDate] = useState("");

//   // Form states
//   const [formData, setFormData] = useState({
//     itemName: "",
//     startingInventory: "",
//     selling: "",
//     remainingInventory: ""
//   });

//   // Panel states
//   const [showSlidePanel, setShowSlidePanel] = useState(false);
//   const [viewMode, setViewMode] = useState('sidebar');

//   const handleShopChange = (e) => {
//     setSelectedShop(e.target.value);
//   };

//   const handleDateChange = (e) => {
//     setSelectedDate(e.target.value);
//   };

//   const handleFormChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleAddItem = (e) => {
//     e.preventDefault();
    
//     if (!selectedShop || !selectedDate || !formData.itemName || !formData.startingInventory || !formData.selling || !formData.remainingInventory) {
//       alert("Please fill in all fields and select shop and date");
//       return;
//     }

//     const newItem = {
//       date: selectedDate,
//       shop: selectedShop,
//       itemName: formData.itemName,
//       startingInventory: parseInt(formData.startingInventory),
//       selling: parseInt(formData.selling),
//       remainingInventory: parseInt(formData.remainingInventory)
//     };

//     setInventoryData(prev => [...prev, newItem]);
    
//     // Reset form
//     setFormData({
//       itemName: "",
//       startingInventory: "",
//       selling: "",
//       remainingInventory: ""
//     });

//     // Close slide panel if in panel mode
//     if (viewMode === 'panel') {
//       setShowSlidePanel(false);
//     }
//   };

//   const togglePanel = () => {
//     setShowSlidePanel(!showSlidePanel);
//   };

//   const switchToSidebar = () => {
//     setViewMode('sidebar');
//     setShowSlidePanel(false);
//   };

//   const switchToPanel = () => {
//     setViewMode('panel');
//   };

//   // Filter data based on selected shop and date
//   const filteredData = inventoryData.filter((item) => {
//     const shopMatch = !selectedShop || item.shop === selectedShop;
//     const dateMatch = !selectedDate || item.date === selectedDate;
//     return shopMatch && dateMatch;
//   });

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
//       <div className="container mx-auto px-4 py-6 max-w-7xl">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
//             T & S Bakery Inventory
//           </h1>
//           <p className="text-slate-600 text-lg">Track and manage your bakery items across all locations</p>
//         </div>

//         {/* View Mode Toggle */}
//         <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//             <div>
//               <h2 className="text-xl font-semibold text-slate-800 mb-1">Add Item Mode</h2>
//               <p className="text-slate-600 text-sm">Choose how you want to add new inventory items</p>
//             </div>
//             <div className="flex bg-slate-100 rounded-lg p-1">
//               <button
//                 onClick={switchToSidebar}
//                 className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
//                   viewMode === 'sidebar' 
//                     ? 'bg-white text-blue-600 shadow-sm' 
//                     : 'text-slate-600 hover:text-slate-800'
//                 }`}
//               >
//                 📋 Sidebar Form
//               </button>
//               <button
//                 onClick={switchToPanel}
//                 className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
//                   viewMode === 'panel' 
//                     ? 'bg-white text-blue-600 shadow-sm' 
//                     : 'text-slate-600 hover:text-slate-800'
//                 }`}
//               >
//                 📱 Slide Panel
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Filters */}
//         <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
//           <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
//             🔍 Filters
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-2">Select Shop:</label>
//               <select 
//                 value={selectedShop} 
//                 onChange={handleShopChange}
//                 className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//               >
//                 <option value="">All Shops</option>
//                 {shops.map((shop, index) => (
//                   <option key={index} value={shop}>
//                     {shop}
//                   </option>
//                 ))}
//               </select>
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-2">Select Date:</label>
//               <input
//                 type="date"
//                 value={selectedDate}
//                 onChange={handleDateChange}
//                 className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//               />
//             </div>
//           </div>
//         </div>

//         <div className={`grid gap-6 ${viewMode === 'sidebar' ? 'lg:grid-cols-4' : 'grid-cols-1'}`}>
//           {/* Form Section - Only show in sidebar mode */}
//           {viewMode === 'sidebar' && (
//             <div className="lg:col-span-1">
//               <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 sticky top-6">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
//                     <span className="text-white text-xl">➕</span>
//                   </div>
//                   <div>
//                     <h2 className="text-lg font-semibold text-slate-800">Add New Item</h2>
//                     <p className="text-slate-600 text-sm">Fill out the form below</p>
//                   </div>
//                 </div>
                
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Item Name:</label>
//                     <input
//                       type="text"
//                       name="itemName"
//                       value={formData.itemName}
//                       onChange={handleFormChange}
//                       placeholder="e.g., Croissant, Muffin"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Starting Inventory:</label>
//                     <input
//                       type="number"
//                       name="startingInventory"
//                       value={formData.startingInventory}
//                       onChange={handleFormChange}
//                       placeholder="Enter starting quantity"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                       min="0"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Selling:</label>
//                     <input
//                       type="number"
//                       name="selling"
//                       value={formData.selling}
//                       onChange={handleFormChange}
//                       placeholder="Enter sold quantity"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                       min="0"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Remaining Inventory:</label>
//                     <input
//                       type="number"
//                       name="remainingInventory"
//                       value={formData.remainingInventory}
//                       onChange={handleFormChange}
//                       placeholder="Enter remaining quantity"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                       min="0"
//                     />
//                   </div>

//                   <button
//                     type="button"
//                     onClick={handleAddItem}
//                     className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
//                   >
//                     <span className="mr-2">✨</span>
//                     Add Item
//                   </button>
//                 </div>

//                 {selectedShop && selectedDate && (
//                   <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
//                     <div className="flex items-center gap-2">
//                       <span className="text-blue-600 text-lg">📍</span>
//                       <p className="text-sm text-blue-700">
//                         Adding to: <span className="font-semibold">{selectedShop}</span> on <span className="font-semibold">{selectedDate}</span>
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {(!selectedShop || !selectedDate) && (
//                   <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
//                     <div className="flex items-center gap-2">
//                       <span className="text-amber-600 text-lg">⚠️</span>
//                       <p className="text-sm text-amber-700">
//                         Please select both shop and date before adding items
//                       </p>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Table Section */}
//           <div className={viewMode === 'sidebar' ? 'lg:col-span-3' : 'col-span-1'}>
//             <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden">
//               <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//                 <div>
//                   <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
//                     📊 Inventory Data
//                   </h2>
//                   <p className="text-slate-600 text-sm mt-1">
//                     {filteredData.length} record(s) found
//                     {selectedShop && ` for ${selectedShop}`}
//                     {selectedDate && ` on ${selectedDate}`}
//                   </p>
//                 </div>
                
//                 {/* Add Button for Panel Mode */}
//                 {viewMode === 'panel' && (
//                   <button
//                     onClick={togglePanel}
//                     className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
//                   >
//                     <span className="text-lg">+</span>
//                     <span>Add New Item</span>
//                   </button>
//                 )}
//               </div>
              
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead className="bg-slate-50">
//                     <tr>
//                       <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
//                       <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Shop</th>
//                       <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Item Name</th>
//                       <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Starting</th>
//                       <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Selling</th>
//                       <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Remaining</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-200">
//                     {filteredData.length > 0 ? (
//                       filteredData.map((row, index) => (
//                         <tr key={index} className="hover:bg-slate-50 transition-colors duration-150">
//                           <td className="px-6 py-4 text-sm text-slate-600">{row.date}</td>
//                           <td className="px-6 py-4 text-sm">
//                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                               {row.shop}
//                             </span>
//                           </td>
//                           <td className="px-6 py-4 text-sm font-medium text-slate-800">{row.itemName}</td>
//                           <td className="px-6 py-4 text-sm text-center">
//                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
//                               {row.startingInventory}
//                             </span>
//                           </td>
//                           <td className="px-6 py-4 text-sm text-center">
//                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
//                               -{row.selling}
//                             </span>
//                           </td>
//                           <td className="px-6 py-4 text-sm text-center">
//                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
//                               {row.remainingInventory}
//                             </span>
//                           </td>
//                         </tr>
//                       ))
//                     ) : (
//                       <tr>
//                         <td colSpan="6" className="px-6 py-12 text-center">
//                           <div className="flex flex-col items-center">
//                             <span className="text-4xl mb-4">📦</span>
//                             <p className="text-slate-500 text-lg font-medium mb-2">No inventory records found</p>
//                             {(selectedShop || selectedDate) && (
//                               <p className="text-slate-400 text-sm">
//                                 Try changing your filter selection or add new items
//                               </p>
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Slide-In Panel */}
//         {viewMode === 'panel' && (
//           <>
//             {/* Overlay */}
//             {showSlidePanel && (
//               <div 
//                 className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
//                 onClick={togglePanel}
//               ></div>
//             )}
            
//             {/* Slide Panel */}
//             <div className={`fixed top-0 right-0 h-full w-96 max-w-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
//               showSlidePanel ? 'translate-x-0' : 'translate-x-full'
//             }`}>
//               <div className="p-6 h-full overflow-y-auto">
//                 <div className="flex justify-between items-center mb-6">
//                   <div>
//                     <h2 className="text-xl font-semibold text-slate-800">Add New Item</h2>
//                     <p className="text-slate-600 text-sm">Fill out the form below</p>
//                   </div>
//                   <button
//                     onClick={togglePanel}
//                     className="text-slate-400 hover:text-slate-600 text-2xl p-1 rounded-lg hover:bg-slate-100 transition-colors duration-150"
//                   >
//                     ×
//                   </button>
//                 </div>

//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Item Name:</label>
//                     <input
//                       type="text"
//                       name="itemName"
//                       value={formData.itemName}
//                       onChange={handleFormChange}
//                       placeholder="Enter item name"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Starting Inventory:</label>
//                     <input
//                       type="number"
//                       name="startingInventory"
//                       value={formData.startingInventory}
//                       onChange={handleFormChange}
//                       placeholder="Enter starting inventory"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                       min="0"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Selling:</label>
//                     <input
//                       type="number"
//                       name="selling"
//                       value={formData.selling}
//                       onChange={handleFormChange}
//                       placeholder="Enter selling quantity"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                       min="0"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-slate-700 mb-2">Remaining Inventory:</label>
//                     <input
//                       type="number"
//                       name="remainingInventory"
//                       value={formData.remainingInventory}
//                       onChange={handleFormChange}
//                       placeholder="Enter remaining inventory"
//                       className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
//                       required
//                       min="0"
//                     />
//                   </div>

//                   <button
//                     type="button"
//                     onClick={handleAddItem}
//                     className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
//                   >
//                     Add Item
//                   </button>
//                 </div>

//                 {selectedShop && selectedDate && (
//                   <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
//                     <div className="flex items-center gap-2">
//                       <span className="text-blue-600 text-lg">📍</span>
//                       <p className="text-sm text-blue-700">
//                         <strong>Adding to:</strong> {selectedShop} on {selectedDate}
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {(!selectedShop || !selectedDate) && (
//                   <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
//                     <div className="flex items-center gap-2">
//                       <span className="text-amber-600 text-lg">⚠️</span>
//                       <p className="text-sm text-amber-700">
//                         <strong>Note:</strong> Please select both shop and date from the filters above before adding items.
//                       </p>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }