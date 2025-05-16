import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';

function App() {
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState('');
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/analyze/?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
        setChartData(data.chart);
        setTableData(data.table);
        setError('');
      } else {
        setError(data.error || 'Something went wrong');
        setSummary('');
        setChartData([]);
        setTableData([]);
      }
    } catch (err) {
      setError('Server error');
    }
  };

  // Compute areas for comparison charts
  const areas = chartData.length > 0
    ? [...new Set(chartData.map(item => item.area).filter(Boolean))]
    : [];

  // Helper to convert tableData to CSV and download
  const downloadCSV = () => {
    if (!tableData.length) return;

    const csvRows = [];
    const headers = Object.keys(tableData[0]);
    csvRows.push(headers.join(','));

    for (const row of tableData) {
      const values = headers.map(header => JSON.stringify(row[header] ?? ""));
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'filtered_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Real Estate Chatbot</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="e.g. Analyze Wakad or Compare Aundh and Ambegaon Budruk"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '400px', padding: '0.5rem' }}
        />
        <button type="submit" style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
          Submit
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {summary && <p><strong>Summary:</strong> {summary}</p>}

      {chartData.length > 0 && (
        <>
          <h2>{areas.length > 1 ? 'Demand Comparison' : 'Price Trend'}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              {areas.length > 1
                ? areas.map((areaName, idx) => (
                    <Line
                      key={areaName}
                      type="monotone"
                      dataKey="flat total"
                      data={chartData.filter(item => item.area === areaName)}
                      name={areaName}
                      stroke={idx === 0 ? "#007bff" : "#ff7300"}
                      strokeWidth={2}
                    />
                  ))
                : (
                    <Line
                      type="monotone"
                      dataKey="flat - weighted average rate"
                      stroke="#007bff"
                      strokeWidth={2}
                    />
                  )}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {tableData.length > 0 && (
        <>
          <h2>Data Table</h2>
          <div style={{ overflowX: 'auto' }}>
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  {Object.keys(tableData[0]).map((col, index) => (
                    <th key={index}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((val, colIndex) => (
                      <td key={colIndex}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={downloadCSV} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Download CSV
          </button>
        </>
      )}
    </div>
  );
}

export default App;
