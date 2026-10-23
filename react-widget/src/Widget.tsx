import { useState, useEffect } from 'react';

// Explicit type definitions for the Perl backend JSON structure
interface PeriodData {
  safe: number;
  reasons: string[];
}

interface WeatherData {
  meta: { generated_at: string };
  next_24h: PeriodData;
  next_48h: PeriodData;
}

export function Widget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // Fetches the weather JSON file updated by your Perl workflow
    fetch('./weather_status.json')
      .then((res) => {
        if (!res.ok) throw new Error('File not found');
        return res.json();
      })
      .then((data: WeatherData) => setWeather(data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div style={{ color: '#666', fontStyle: 'italic' }}>
        -- Weather widget temporarily unavailable --
      </div>
    );
  }
  
  if (!weather) {
    return (
      <div style={{ color: '#666' }}>
        -- Evaluating conditions via weather models --
      </div>
    );
  }

  const renderWindow = (title: string, periodData: PeriodData) => (
    <div style={{ 
      whiteSpace: "nowrap",
      padding: '8px', 
      borderRadius: '8px', 
      margin: '8px 0', 
      border: '3px dashed #262626', 
      backgroundColor: periodData.safe ? '#e6f4ea' : '#fce8e6' 
    }}>
      {title}: <span style={{ color: periodData.safe ? '#137333' : '#c5221f' }}>
        {periodData.safe ? "Favorable conditions" : "Unfavorable conditions"}
      </span>
      <ul style={{ margin: '0', color: '#555', padding: '0 0 0 0', paddingLeft: '15px' }}>
        {periodData.reasons.slice(0, 3).map((r, idx) => <li style={{ padding: '0px', margin: '0px' }} key={idx}>{r}</li>)}
      </ul>
    </div>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
      <h4 style={{ margin: '0 0 4px 0' }}>Automated Weather Forecast </h4>
      <p style={{ color: '#666', margin: '0', padding: '0' }}>
        Source: Deutscher Wetterdienst at {weather.meta.generated_at}
      </p>
      {renderWindow("Next 24 Hours", weather.next_24h)}
      {renderWindow("Next 48 Hours", weather.next_48h)}
    </div>
  );
}