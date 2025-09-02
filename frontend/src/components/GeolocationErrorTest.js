import React, { useState } from 'react';
import { getCurrentPosition } from '../utils/geolocation';

const GeolocationErrorTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  const addTestResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { 
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const testGeolocationPermission = async () => {
    setIsTesting(true);
    addTestResult('Testing geolocation permission...', 'info');
    
    try {
      const position = await getCurrentPosition({ timeout: 5000 });
      addTestResult(`✅ Success: Got position (${position.coords.latitude}, ${position.coords.longitude})`, 'success');
    } catch (error) {
      addTestResult(`❌ Error: ${error.message}`, 'error');
      addTestResult(`Error code: ${error.code}`, 'info');
      addTestResult(`Error type: ${error.constructor.name}`, 'info');
    } finally {
      setIsTesting(false);
    }
  };

  const testGeolocationWithTimeout = async () => {
    setIsTesting(true);
    addTestResult('Testing geolocation with short timeout...', 'info');
    
    try {
      const position = await getCurrentPosition({ timeout: 1000 }); // Very short timeout
      addTestResult(`✅ Success: Got position (${position.coords.latitude}, ${position.coords.longitude})`, 'success');
    } catch (error) {
      addTestResult(`❌ Timeout Error: ${error.message}`, 'error');
      addTestResult(`Error code: ${error.code}`, 'info');
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Geolocation Error Handling Test</h2>
      
      <div className="mb-4 space-x-2">
        <button
          onClick={testGeolocationPermission}
          disabled={isTesting}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isTesting ? 'Testing...' : 'Test Geolocation'}
        </button>
        
        <button
          onClick={testGeolocationWithTimeout}
          disabled={isTesting}
          className="bg-orange-500 hover:bg-orange-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isTesting ? 'Testing...' : 'Test Timeout'}
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Test Results:</h3>
        {testResults.length === 0 ? (
          <p className="text-gray-500 italic">No test results yet. Click a test button above.</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className={`text-sm ${getResultColor(result.type)}`}>
                <span className="text-gray-400">[{result.timestamp}]</span> {result.message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click "Test Geolocation" to test normal geolocation access</li>
          <li>• Click "Test Timeout" to test timeout error handling</li>
          <li>• Deny location permission in your browser to test permission errors</li>
          <li>• Check the browser console for detailed error logs</li>
          <li>• The global error handler should prevent runtime errors from showing</li>
        </ul>
      </div>
    </div>
  );
};

export default GeolocationErrorTest;
