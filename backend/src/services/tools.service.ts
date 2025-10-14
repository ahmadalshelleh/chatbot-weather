import axios from 'axios';
import { Tool } from '../types';

export const TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name, e.g. San Francisco'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit'
          }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_forecast',
      description: 'Get weather forecast for next 5 days',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name'
          }
        },
        required: ['location']
      }
    }
  }
];

interface WeatherData {
  location: string;
  temperature?: number;
  description?: string;
  humidity?: number;
  unit?: string;
  error?: string;
}

interface ForecastData {
  location: string;
  forecast?: Array<{
    time: string;
    temp: number;
    description: string;
  }>;
  error?: string;
}

export async function getCurrentWeather(
  location: string,
  unit: string = 'celsius'
): Promise<WeatherData> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const units = unit === 'celsius' ? 'metric' : 'imperial';

    const response = await axios.get(
      'http://api.openweathermap.org/data/2.5/weather',
      {
        params: { q: location, appid: apiKey, units }
      }
    );

    return {
      location,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      unit
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return { location, error: 'Could not fetch weather data' };
  }
}

export async function getForecast(location: string): Promise<ForecastData> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    const response = await axios.get(
      'http://api.openweathermap.org/data/2.5/forecast',
      {
        params: { q: location, appid: apiKey, units: 'metric' }
      }
    );

    const forecasts = response.data.list.slice(0, 5).map((item: any) => ({
      time: item.dt_txt,
      temp: item.main.temp,
      description: item.weather[0].description
    }));

    return { location, forecast: forecasts };
  } catch (error) {
    console.error('Forecast API error:', error);
    return { location, error: 'Could not fetch forecast data' };
  }
}

export async function executeTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case 'get_current_weather':
      return getCurrentWeather(args.location, args.unit);
    case 'get_forecast':
      return getForecast(args.location);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
