import React, { useState } from "react";
import DataPicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function selectionPage() {
  const shops = ["Shop A", "Shop B", "Shop C", "Shop D"];

  const data = [
    { date: "2025-08-10", shop: "Shop A" },
    { date: "2025-08-12", shop: "Shop B" },
    { date: "2025-08-13", shop: "Shop C" },
    { date: "2025-08-15", shop: "Shop D" },
    { date: "2025-08-17", shop: "Shop A" },
  ];
  const [selectedShop, setSelectedShop] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleShopChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setSelectedShop(selected);
  };

  const filterData = data.filter((item) => {
    const isInShop =
      selectedShop.length === 0 || selectedShop.includes(item.shop);

    const isInDate =
      (!startDate || item.date >= startDate.toISOString().split("T")[0]) &&
      (!endDate || item.date <= endDate.toISOString().split("T")[0]);

    return isInDate && isInShop;
  });

  return (
    <div className="selection-container">
      <h1>Shop Selection</h1>

      <div className="filters">
        <div>
          <label>Start Date:</label>
          <DataPicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            maxDate={new Date()}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select start date"
          />
        </div>
        <div>
          <label>End Date:</label>
          <DataPicker
            selected={endDate}
            onChange={(date) => setStartDate(date)}
            maxDate={new Date()}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select End date"
          />
        </div>
        <div>
          <label>Select Shop:</label>
          <select multiple value={selectedShop} onChange={handleShopChange}>
            {shops.map((shop, index) => (
              <option key={index} value={shop}>
                {shop}
              </option>
            ))}
          </select>
        </div>
        <table>
          <thead>
         Welcome to our channel! 🎶 Here you’ll find the latest trending songs along with lyrics so you can sing along. We bring you music that’s popular, fresh, and fun — from catchy tunes to heartfelt melodies. Subscribe and join us for nonstop music vibes and the hottest tracks!"   <tr>
              <th>Date</th>
              <th>Shop Name</th>
            </tr>
          </thead>
          <tbody>
            {filterData.length > 0 ? (
              filterData.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td>{row.shop}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
