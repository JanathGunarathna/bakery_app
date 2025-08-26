import React, { useState, useEffect, useCallback, useMemo } from "react";
import { firestore } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

const SHOPS = [
  "Katuwawala",
  "Koswatta",
  "Arawwala",
  "Depanama",
  "Maharagama A",
  "Maharagama B",
  "Maharagama C",
];

export default function SummaryPage() {
  // Dark mode state - using React state instead of localStorage
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // State management
  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [priceData, setPriceData] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    shop: SHOPS[0],
    date: new Date().toISOString().split("T")[0],
  });

  // Cash balance states
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  const navigate = useNavigate();

  // Firestore collection references
  const inventoryRef = collection(firestore, "inventory");
  const pricesRef = collection(firestore, "prices");

  // Navigation function
  const navigateToPage = useCallback(
    (page) => {
      navigate(page);
    },
    [navigate]
  );

  // Get price for an item in a specific shop
  const getItemPrice = useCallback(
    (itemName, shop) => {
      const priceRecord = priceData.find(
        (price) => price.itemName === itemName && price.shop === shop
      );
      return priceRecord ? parseFloat(priceRecord.price) || 0 : null;
    },
    [priceData]
  );

  // Fetch data from Firestore
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch inventory data from inventory collection
      const inventoryQuery = query(inventoryRef, orderBy("createdAt", "desc"));
      const inventorySnapshot = await getDocs(inventoryQuery);

      const inventoryItems = inventorySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch price data from prices collection
      const priceQuery = query(pricesRef);
      const priceSnapshot = await getDocs(priceQuery);

      const priceItems = priceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
          getDocs(pricesRef),
        ]);

        const inventoryItems = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const priceItems = priceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Manual sort by createdAt
        inventoryItems.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        setInventoryData(inventoryItems);
        setPriceData(priceItems);
        console.log(
          "Fetched data (fallback) - inventory:",
          inventoryItems.length,
          "prices:",
          priceItems.length
        );
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
    fetchData();
  }, [fetchData]);

  // Handle filter changes
  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Date navigation
  const navigateDate = useCallback(
    (days) => {
      const currentDate = new Date(filters.date);
      currentDate.setDate(currentDate.getDate() + days);
      const newDate = currentDate.toISOString().split("T")[0];
      handleFilterChange("date", newDate);
    },
    [filters.date, handleFilterChange]
  );

  // Filter inventory data based on current filters
  const filteredInventoryData = useMemo(() => {
    return inventoryData.filter(
      (item) => item.shop === filters.shop && item.date === filters.date
    );
  }, [inventoryData, filters]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalItems = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.addedInventory) || 0),
      0
    );
    const totalMorningTime = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.morningTime) || 0),
      0
    );
    const totalEveningTime = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.eveningTime) || 0),
      0
    );
    const totalExtraIn = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.extraIn) || 0),
      0
    );
    const totalSold = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.selling) || 0),
      0
    );
    const totalTransferOut = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.transferOut) || 0),
      0
    );
    const totalDiscard = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.discard) || 0),
      0
    );
    const totalRemaining = filteredInventoryData.reduce(
      (sum, item) => sum + (parseInt(item.remainingInventory) || 0),
      0
    );

    // Calculate total sales value
    const totalSalesValue = filteredInventoryData.reduce((sum, item) => {
      const itemPrice = getItemPrice(item.itemName, item.shop);
      const selling = parseInt(item.selling) || 0;
      return sum + (itemPrice !== null ? selling * itemPrice : 0);
    }, 0);

    const totalStartingInventory =
      totalItems + totalMorningTime + totalEveningTime + totalExtraIn;

    return {
      totalItems,
      totalMorningTime,
      totalEveningTime,
      totalExtraIn,
      totalStartingInventory,
      totalSold,
      totalTransferOut,
      totalDiscard,
      totalRemaining,
      totalSalesValue,
      itemTypes: filteredInventoryData.length,
      soldPercentage:
        totalStartingInventory > 0
          ? ((totalSold / totalStartingInventory) * 100).toFixed(1)
          : 0,
    };
  }, [filteredInventoryData, getItemPrice]);

  // Enhanced table data with prices
  const enhancedTableData = useMemo(() => {
    return filteredInventoryData.map((item) => {
      const itemPrice = getItemPrice(item.itemName, item.shop);
      const selling = parseInt(item.selling) || 0;
      const salesValue = itemPrice !== null ? selling * itemPrice : null;

      return {
        ...item,
        price: itemPrice,
        salesValue: salesValue,
        addedInventory: parseInt(item.addedInventory) || 0,
        morningTime: parseInt(item.morningTime) || 0,
        eveningTime: parseInt(item.eveningTime) || 0,
        extraIn: parseInt(item.extraIn) || 0,
        selling: selling,
        transferOut: parseInt(item.transferOut) || 0,
        discard: parseInt(item.discard) || 0,
        remainingInventory: parseInt(item.remainingInventory) || 0,
      };
    });
  }, [filteredInventoryData, getItemPrice]);

  // Calculate cash balance
  const calculatedClosingBalance = useMemo(() => {
    return openingBalance + summaryStats.totalSalesValue;
  }, [openingBalance, summaryStats.totalSalesValue]);

  // Update closing balance when calculated value changes
  useEffect(() => {
    setClosingBalance(calculatedClosingBalance);
  }, [calculatedClosingBalance]);

  // Generate PDF function
  // Updated PDF download function with proper jsPDF loading
  const handleDownloadPDF = useCallback(() => {
    console.log("Download PDF clicked");

    // Check if jsPDF is already loaded and accessible
    if (
      typeof window.jsPDF !== "undefined" ||
      typeof window.jspdf !== "undefined"
    ) {
      console.log("jsPDF already loaded, generating PDF...");
      generatePDFContent();
      return;
    }

    console.log("Loading jsPDF library...");

    // Create script element with proper configuration
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = false; // Load synchronously to ensure proper initialization
    script.crossOrigin = "anonymous";

    script.onload = () => {
      console.log("jsPDF script loaded successfully");
      // Wait for the library to be fully initialized
      setTimeout(() => {
        // Check if jsPDF is now available
        if (
          typeof window.jsPDF !== "undefined" ||
          typeof window.jspdf !== "undefined"
        ) {
          console.log("jsPDF is now available");
          generatePDFContent();
        } else {
          console.error("jsPDF loaded but not accessible");
          alert(
            "PDF library loaded but not accessible. Downloading as text file instead."
          );
          //   generateTextFile();
        }
      }, 200);
    };

    script.onerror = (error) => {
      console.error("Failed to load jsPDF script:", error);
      alert("Failed to load PDF library. Downloading as text file instead.");
      // generateTextFile();
    };

    // Remove any existing jsPDF scripts to avoid conflicts
    const existingScripts = document.querySelectorAll('script[src*="jspdf"]');
    existingScripts.forEach((s) => s.remove());

    document.head.appendChild(script);
  }, [
    filters,
    summaryStats,
    openingBalance,
    closingBalance,
    enhancedTableData,
  ]);

  // Fixed PDF generation function
  const generatePDFContent = useCallback(() => {
    try {
      console.log("Starting PDF generation...");

      // Try different ways to access jsPDF based on how it might be loaded
      let jsPDFConstructor = null;

      if (typeof window.jsPDF !== "undefined") {
        // Method 1: Direct access to jsPDF
        if (typeof window.jsPDF.jsPDF !== "undefined") {
          jsPDFConstructor = window.jsPDF.jsPDF;
        } else if (typeof window.jsPDF === "function") {
          jsPDFConstructor = window.jsPDF;
        }
      } else if (typeof window.jspdf !== "undefined") {
        // Method 2: Lowercase jspdf
        if (typeof window.jspdf.jsPDF !== "undefined") {
          jsPDFConstructor = window.jspdf.jsPDF;
        }
      }

      if (!jsPDFConstructor) {
        throw new Error("jsPDF constructor not found");
      }

      // Initialize the PDF document
      const doc = new jsPDFConstructor({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      console.log("PDF document initialized successfully");

      // Set up document properties
      let yPosition = 20;
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const maxWidth = pageWidth - 2 * margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 10) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("T & S Bakery - Daily Summary Report", margin, yPosition);
      yPosition += 12;

      // Basic Info
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Shop: ${filters.shop}`, margin, yPosition);
      doc.text(`Date: ${filters.date}`, margin + 80, yPosition);
      yPosition += 10;

      // Add a line separator
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Financial Summary Section
      checkPageBreak(25);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL SUMMARY", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const financialData = [
        `Opening Balance: Rs. ${openingBalance.toFixed(2)}`,
        `Total Sales Value: Rs. ${summaryStats.totalSalesValue.toFixed(2)}`,
        `Closing Balance: Rs. ${closingBalance.toFixed(2)}`,
      ];

      financialData.forEach((line) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 5;

      // Summary Statistics
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INVENTORY SUMMARY", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const summaryData = [
        `Total Items Added: ${summaryStats.totalItems}`,
        `Morning Time Added: ${summaryStats.totalMorningTime}`,
        `Evening Time Added: ${summaryStats.totalEveningTime}`,
        `Extra Items In: ${summaryStats.totalExtraIn}`,
        `Total Starting Inventory: ${summaryStats.totalStartingInventory}`,
        `Total Items Sold: ${summaryStats.totalSold}`,
        `Total Transfer Out: ${summaryStats.totalTransferOut}`,
        `Total Discard: ${summaryStats.totalDiscard}`,
        `Total Remaining: ${summaryStats.totalRemaining}`,
        `Item Types: ${summaryStats.itemTypes}`,
        `Sales Percentage: ${summaryStats.soldPercentage}%`,
      ];

      // Display summary in two columns to save space
      const midPoint = Math.ceil(summaryData.length / 2);
      const leftColumn = summaryData.slice(0, midPoint);
      const rightColumn = summaryData.slice(midPoint);

      const startY = yPosition;
      leftColumn.forEach((line, index) => {
        doc.text(line, margin + 5, startY + index * 5);
      });

      rightColumn.forEach((line, index) => {
        doc.text(line, margin + 100, startY + index * 5);
      });

      yPosition += Math.max(leftColumn.length, rightColumn.length) * 5 + 5;

      // Detailed Table
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED BREAKDOWN", margin, yPosition);
      yPosition += 10;

      // Table setup
      const headers = [
        "Item",
        "Added",
        "Morn",
        "Even",
        "Extra",
        "Sold",
        "Remain",
        "Price",
        "Sales",
      ];
      const colWidths = [32, 15, 12, 12, 12, 12, 15, 18, 22];

      // Draw table header
      let xPosition = margin;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      // Header background
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPosition - 2, maxWidth, 6, "F");

      headers.forEach((header, index) => {
        doc.text(header, xPosition + 1, yPosition + 2);
        xPosition += colWidths[index];
      });
      yPosition += 8;

      // Table data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      enhancedTableData.forEach((item, rowIndex) => {
        checkPageBreak(6);

        xPosition = margin;

        // Alternate row coloring
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition - 1, maxWidth, 5, "F");
        }

        const rowData = [
          item.itemName.length > 15
            ? item.itemName.substring(0, 15) + "..."
            : item.itemName,
          item.addedInventory.toString(),
          item.morningTime.toString(),
          item.eveningTime.toString(),
          item.extraIn.toString(),
          item.selling.toString(),
          item.remainingInventory.toString(),
          item.price !== null ? item.price.toFixed(2) : "N/A",
          item.salesValue !== null ? item.salesValue.toFixed(2) : "N/A",
        ];

        rowData.forEach((data, index) => {
          // Right align numbers, left align text
          if (index === 0) {
            doc.text(data, xPosition + 1, yPosition + 2);
          } else {
            const textWidth = doc.getTextWidth(data);
            doc.text(
              data,
              xPosition + colWidths[index] - textWidth - 1,
              yPosition + 2
            );
          }
          xPosition += colWidths[index];
        });

        yPosition += 5;
      });

      // Footer
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        margin,
        yPosition
      );

      // Add page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `T&S_Bakery_Summary_${filters.shop}_${filters.date}.pdf`;
      console.log("Saving PDF:", fileName);
      doc.save(fileName);

      console.log("PDF generated successfully");
      alert("PDF report generated and downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(
        `PDF generation failed: ${error.message}. Downloading as text file instead.`
      );
      // generateTextFile();
    }
  }, [
    filters,
    summaryStats,
    openingBalance,
    closingBalance,
    enhancedTableData,
  ]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800"
          : "bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100"
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
                  ? "from-green-400 to-emerald-400"
                  : "from-green-600 to-emerald-600"
              } bg-clip-text text-transparent mb-3`}
            >
              Daily Summary Report
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
            Comprehensive daily business report and analytics
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
              onClick={() => navigateToPage("/addPrice")}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              💰 Price Management
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              📄 Download PDF
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
            🪧 Report Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
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
                  className={`flex-1 border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
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
                className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                📅 Today
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? "🔄 Loading..." : "🔄 Refresh"}
              </button>
            </div>
          </div>
        </section>

        {/* Cash Balance Section */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 mb-6 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/20"
              : "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200/20"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-green-300" : "text-green-800"
            }`}
          >
            💰 Cash Balance Management
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="opening-balance"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Opening Balance (Rs.):
              </label>
              <input
                id="opening-balance"
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) =>
                  setOpeningBalance(parseFloat(e.target.value) || 0)
                }
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Sales Value (Rs.):
              </label>
              <div
                className={`w-full border rounded-lg px-3 py-2.5 font-medium ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-green-400"
                    : "bg-green-50 border-green-300 text-green-800"
                }`}
              >
                {summaryStats.totalSalesValue.toFixed(2)}
              </div>
            </div>

            <div>
              <label
                htmlFor="closing-balance"
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-green-300" : "text-green-700"
                }`}
              >
                Closing Balance (Rs.):
              </label>
              <input
                id="closing-balance"
                type="number"
                step="0.01"
                value={closingBalance}
                onChange={(e) =>
                  setClosingBalance(parseFloat(e.target.value) || 0)
                }
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
                placeholder="0.00"
              />
              <p
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                Auto-calculated: Rs. {calculatedClosingBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        {/* Summary Statistics */}
        <section
          className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 mb-6 transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800/90 border-gray-700/20"
              : "bg-white/90 border-white/20"
          }`}
        >
          <h2
            className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
              isDarkMode ? "text-slate-200" : "text-slate-800"
            }`}
          >
            📊 Summary Statistics - {filters.shop} - {filters.date}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                {summaryStats.totalItems}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                Items Added
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-indigo-900/30" : "bg-indigo-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                {summaryStats.totalStartingInventory}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-indigo-300" : "text-indigo-700"
                }`}
              >
                Starting Total
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-orange-900/30" : "bg-orange-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-orange-400" : "text-orange-600"
                }`}
              >
                {summaryStats.totalSold}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-orange-300" : "text-orange-700"
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
                {summaryStats.totalRemaining}
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
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-red-900/30" : "bg-red-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                {summaryStats.totalTransferOut + summaryStats.totalDiscard}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-red-300" : "text-red-700"
                }`}
              >
                Transfer + Discard
              </div>
            </div>

            <div
              className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                isDarkMode ? "bg-purple-900/30" : "bg-purple-50"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                }`}
              >
                {summaryStats.itemTypes}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-purple-300" : "text-purple-700"
                }`}
              >
                Item Types
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
                {summaryStats.soldPercentage}%
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-yellow-300" : "text-yellow-700"
                }`}
              >
                Sales Rate
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
                Rs. {summaryStats.totalSalesValue.toFixed(2)}
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
        </section>

        {/* Detailed Table */}
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
              📋 Detailed Breakdown
            </h2>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Item-wise sales and inventory details
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
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Added
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Morning
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Evening
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Extra In
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Sold
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Remaining
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Price (Rs.)
                  </th>
                  <th
                    className={`px-4 py-4 text-center text-sm font-semibold ${
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Sales Value (Rs.)
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
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
                        <p
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Loading summary data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : enhancedTableData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        No data found for {filters.shop} on {filters.date}
                      </div>
                      <p
                        className={`text-sm mt-2 ${
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        Try selecting a different date or shop, or add inventory
                        data first.
                      </p>
                    </td>
                  </tr>
                ) : (
                  enhancedTableData.map((item, index) => {
                    const hasData =
                      item.addedInventory > 0 ||
                      item.morningTime > 0 ||
                      item.eveningTime > 0 ||
                      item.extraIn > 0 ||
                      item.selling > 0 ||
                      item.transferOut > 0 ||
                      item.discard > 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors duration-150 ${
                          hasData
                            ? isDarkMode
                              ? "bg-blue-900/20 hover:bg-blue-800/30"
                              : "bg-blue-50/50 hover:bg-blue-100/50"
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
                                hasData
                                  ? "bg-green-500"
                                  : isDarkMode
                                  ? "bg-slate-600"
                                  : "bg-slate-300"
                              }`}
                            ></span>
                            <span>{item.itemName}</span>
                            {item.price === null && hasData && (
                              <span
                                className="text-red-500 text-xs"
                                title="Price missing"
                              >
                                ⚠️
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-blue-900/50 text-blue-300"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.addedInventory}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-indigo-900/50 text-indigo-300"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {item.morningTime}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-violet-900/50 text-violet-300"
                                : "bg-violet-100 text-violet-800"
                            }`}
                          >
                            {item.eveningTime}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-teal-900/50 text-teal-300"
                                : "bg-teal-100 text-teal-800"
                            }`}
                          >
                            {item.extraIn}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isDarkMode
                                ? "bg-orange-900/50 text-orange-300"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {item.selling}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.remainingInventory > 0
                                ? isDarkMode
                                  ? "bg-emerald-900/50 text-emerald-300"
                                  : "bg-emerald-100 text-emerald-800"
                                : item.remainingInventory === 0
                                ? isDarkMode
                                  ? "bg-yellow-900/50 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-800"
                                : isDarkMode
                                ? "bg-red-900/50 text-red-300"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.remainingInventory}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-center">
                          {item.price !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isDarkMode
                                  ? "bg-purple-900/50 text-purple-300"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {item.price.toFixed(2)}
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

                        <td className="px-4 py-4 text-sm text-center">
                          {item.salesValue !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.salesValue > 0
                                  ? isDarkMode
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-green-100 text-green-800"
                                  : isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {item.salesValue.toFixed(2)}
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

        {/* Action Buttons Section */}
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
            Actions & Reports
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleDownloadPDF}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
            >
              <span className="text-xl">📄</span>
              <div>
                <div className="font-semibold">Download PDF Report</div>
                <div className="text-xs opacity-90">Complete daily summary</div>
              </div>
            </button>

            <button
              onClick={() => navigateToPage("/selection")}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
            >
              <span className="text-xl">📋</span>
              <div>
                <div className="font-semibold">Update Inventory</div>
                <div className="text-xs opacity-90">Modify daily data</div>
              </div>
            </button>

            <button
              onClick={() => navigateToPage("/addPrice")}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
            >
              <span className="text-xl">💰</span>
              <div>
                <div className="font-semibold">Manage Prices</div>
                <div className="text-xs opacity-90">Update item pricing</div>
              </div>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer
          className={`text-center mt-8 py-6 text-sm ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <p>T & S Bakery - Daily Summary Report</p>
          <p className="mt-1">
            Shop: {filters.shop} | Date: {filters.date} | Total Sales: Rs.{" "}
            {summaryStats.totalSalesValue.toFixed(2)} | Items:{" "}
            {summaryStats.itemTypes}
          </p>
          <p className="mt-1 text-xs">
            Opening Balance: Rs. {openingBalance.toFixed(2)} | Closing Balance:
            Rs. {closingBalance.toFixed(2)}
          </p>
        </footer>
      </div>
    </div>
  );
}
