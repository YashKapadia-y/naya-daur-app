import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Import charting library (recharts)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line
} from 'recharts';

// Import icons (lucide-react)
import {
  Home,
  Target,
  WandSparkles,
  DollarSign,
  Info,
  Check,
  KeyRound,
  Loader2,
  AlertTriangle,
  X,
  Bot,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Smile,
  Meh,
  Frown,
  Users // For Persona Architect
} from 'lucide-react';

/* --- New Dark/Purple AI Theme Color Palette --- */
// Inspired by the provided image.
const THEME_COLORS = {
  background: '#1E1A3D', // Deep dark blue/purple
  cardBackground: '#2B2456', // Slightly lighter purple for cards
  textPrimary: '#FFFFFF',      // White
  textSecondary: '#D9D4E7', // Light lavender/gray
  accentPrimary: '#9E78F0', // Bright violet
  accentSecondary: '#7A5CFA', // Bright blue/purple
  accentTertiary: '#5C4A9C', // Muted purple
  border: '#4A3F7A',      // Mid-dark purple border
  error: '#FF4136',      // Bright Red for errors
  success: '#2ECC71',    // Bright Green for success
};

// Colors for Charts
const CHART_COLORS = [THEME_COLORS.accentPrimary, THEME_COLORS.accentSecondary, THEME_COLORS.accentTertiary, '#8884d8'];


// --- Helper Functions ---

/**
 * A wrapper for fetch that includes exponential backoff.
 */
const fetchWithBackoff = async (url, options, retries = 3, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        // Throttled, retry with backoff
        await new Promise(res => setTimeout(res, delay));
        return fetchWithBackoff(url, options, retries - 1, delay * 2);
      }
      
      let errorBody = null;
      let detailedMessage = response.statusText;
      try {
        errorBody = await response.json();
        detailedMessage = errorBody?.error?.message || detailedMessage;
      } catch (e) {
        // Ignore if response body is not JSON or errors
      }
      
      console.error("API Error Response Body:", errorBody); // Log the full error
      throw new Error(`API Error: ${response.status} ${detailedMessage}`);
    }
    return response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

// 2-Step Fetch Function: Grounded Text -> JSON Parsing
const fetchGroundedJson = async (apiKey, textPrompt, jsonSchema, setLoadingMessage) => {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  // Step 1: Get grounded text data using Google Search
  setLoadingMessage("Step 1/2: Searching for grounded insights...");
  const searchPayload = {
    contents: [{ parts: [{ text: textPrompt }] }],
    tools: [{ "google_search": {} }],
  };

  const searchData = await fetchWithBackoff(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchPayload),
  });

  const groundedText = searchData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!groundedText) {
    throw new Error('Step 1 Failed: No content returned from analysis.');
  }

  // Step 2: Parse the grounded text into the required JSON schema
  setLoadingMessage("Step 2/2: Analyzing and structuring data...");
  
  const parseJsonPrompt = `
    Parse the following market analysis text and convert it into a valid JSON object matching the provided schema.

    TEXT TO PARSE:
    ---
    ${groundedText}
    ---

    Respond ONLY with the valid JSON object.
  `;

  const jsonPayload = {
    contents: [{ parts: [{ text: parseJsonPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jsonSchema
    }
  };

  const jsonData = await fetchWithBackoff(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonPayload),
  });

  const jsonText = jsonData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (jsonText) {
    return JSON.parse(jsonText);
  } else {
    throw new Error('Step 2 Failed: No JSON content returned from parsing.');
  }
};


// --- Reusable UI Components (New Dark Theme) ---

const StyledInput = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${className}`}
    style={{
      borderColor: THEME_COLORS.border,
      backgroundColor: THEME_COLORS.background,
      color: THEME_COLORS.textPrimary,
      '--tw-ring-color': THEME_COLORS.accentPrimary
    }}
    {...props}
  />
));

const StyledButton = ({ children, className, variant = 'primary', isLoading = false, ...props }) => {
  const baseStyle = 'px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center';
  const variants = {
    primary: {
      backgroundColor: THEME_COLORS.accentPrimary,
      color: THEME_COLORS.textPrimary,
      '--tw-ring-color': THEME_COLORS.accentPrimary,
      '--tw-ring-offset-color': THEME_COLORS.cardBackground
    },
    secondary: {
      backgroundColor: THEME_COLORS.accentSecondary,
      color: THEME_COLORS.textPrimary,
      '--tw-ring-color': THEME_COLORS.accentSecondary,
      '--tw-ring-offset-color': THEME_COLORS.cardBackground
    },
  };
  
  const style = variants[variant] || variants['primary'];

  return (
    <button 
      className={`${baseStyle} ${className}`} 
      style={{
        ...style,
        opacity: props.disabled || isLoading ? 0.7 : 1,
        cursor: props.disabled || isLoading ? 'not-allowed' : 'pointer'
      }}
      disabled={props.disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 size={20} className="animate-spin" /> : children}
    </button>
  );
};

const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div 
        className="rounded-2xl shadow-2xl p-8 max-w-lg w-full m-4 relative border"
        style={{
          backgroundColor: THEME_COLORS.cardBackground,
          borderColor: THEME_COLORS.border
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          style={{ color: THEME_COLORS.textSecondary }}
        >
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

const ErrorToast = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center"
      style={{ backgroundColor: THEME_COLORS.error, color: 'white' }}
    >
      <AlertTriangle size={24} className="mr-3" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white">
        <X size={20} />
      </button>
    </div>
  );
};

const LoadingSpinner = ({ size = 24, className = "" }) => (
  <Loader2 
    size={size} 
    className={`animate-spin ${className}`}
    style={{ color: THEME_COLORS.accentPrimary }}
  />
);

const ChartContainer = ({ title, children, height = 300 }) => ( // Added height prop
  <div 
    className="rounded-xl shadow-lg p-6 border"
    style={{ 
      backgroundColor: THEME_COLORS.cardBackground,
      borderColor: THEME_COLORS.border 
    }}
  >
    <h3 
      className="text-xl font-semibold mb-4"
      style={{ color: THEME_COLORS.textPrimary }}
    >
      {title}
    </h3>
    <div style={{ width: '100%', height: height }}> {/* Use height prop */}
      {/* Recharts components need explicit text color props for dark mode */}
      <ResponsiveContainer>
        {React.cloneElement(children, {
          ...children.props,
          // Pass down text color for axes, labels, etc.
          // This will be picked up by XAxis, YAxis, Legend, Tooltip
          stroke: THEME_COLORS.textSecondary,
          fill: THEME_COLORS.textSecondary,
          tick: { fill: THEME_COLORS.textSecondary },
          label: { fill: THEME_COLORS.textSecondary }
        })}
      </ResponsiveContainer>
    </div>
  </div>
);

const StatCard = ({ title, value, icon, bgColor }) => (
  <div 
    className="rounded-xl shadow-md p-6 flex items-center space-x-4 border"
    style={{ 
      backgroundColor: THEME_COLORS.cardBackground, 
      borderColor: THEME_COLORS.border 
    }}
  >
    <div 
      className="p-3 rounded-full"
      style={{ backgroundColor: `${THEME_COLORS.accentPrimary}30` }} // Transparent accent
    >
      {React.cloneElement(icon, { size: 24, style: { color: THEME_COLORS.accentPrimary } })}
    </div>
    <div>
      <p className="text-sm font-medium" style={{ color: THEME_COLORS.textSecondary }}>{title}</p>
      <p className="text-2xl font-bold" style={{ color: THEME_COLORS.textPrimary }}>{value}</p>
    </div>
  </div>
);

// --- Tab Components ---

// --- Tab 1: Welcome ---
const WelcomeTab = ({ onApiKeySave }) => {
  const [key, setKey] = useState('');

  const handleSave = () => {
    onApiKeySave(key);
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 
          className="text-5xl font-extrabold"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          Welcome to <span style={{ color: THEME_COLORS.accentPrimary }}>Naya Daur</span>
        </h1>
        <p className="mt-4 text-xl" style={{ color: THEME_COLORS.textSecondary }}>
          Ushering in a New Era of AI-Powered Marketing
        </p>
      </div>

      {/* API Key Input */}
      <div 
        className="max-w-xl mx-auto p-8 rounded-xl shadow-lg border"
        style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
      >
        <h2 
          className="text-2xl font-semibold text-center mb-6"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          Activate Your Dashboard
        </h2>
        <div className="flex items-center space-x-3">
          <KeyRound size={24} style={{ color: THEME_COLORS.textSecondary }} />
          <StyledInput
            type="password"
            placeholder="Enter your Gemini API Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <StyledButton onClick={handleSave} className="w-full mt-4" isLoading={false}>
          <Check size={20} className="inline-block mr-2" />
          Save and Activate
        </StyledButton>
      </div>

      {/* Vision */}
      <div 
        className="p-8 rounded-xl shadow-md border"
        style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
      >
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          Our Vision: Ushering in a New Era of Marketing
        </h2>
        <p style={{ color: THEME_COLORS.textSecondary }} className="leading-relaxed">
          Naya Daur (meaning 'New Era') was built on the belief that
          Generative AI can democratize strategic marketing. Our vision is to
          empower businesses of all sizes to understand complex markets,
          connect with cultures, and forge highly effective campaigns with
          the power of AI.
        </p>
      </div>

      {/* Stats */}
      <div>
        <h2 
          className="text-3xl font-bold mb-6 text-center"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          Our Success
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Campaigns Forged" value="500+" icon={<WandSparkles />} />
          <StatCard title="Avg. Engagement Lift" value="30%" icon={<Target />} />
          <StatCard title="Market Insight Accuracy" value="95%" icon={<Info />} />
        </div>
      </div>

      {/* Customers */}
      <div>
        <h2 
          className="text-3xl font-bold mb-6 text-center"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          Trusted By
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
          {[
            'InnovateCorp',
            'BharatBoost',
            'GlobalTech Solutions',
            'Aura Consumer Goods',
          ].map((name) => (
            <span key={name} className="text-xl font-semibold" style={{ color: THEME_COLORS.textSecondary }}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Tab 2: Persona Architect (NEW) ---

// Define the JSON schema for Persona Architect
const personaArchitectSchema = {
  type: "OBJECT",
  properties: {
    personas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          age: { type: "NUMBER" },
          role: { type: "STRING" },
          demographic: { type: "STRING" },
          psychographics: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          painPoints: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          motivators: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          preferredChannels: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          keyMessage: { type: "STRING" }
        },
        required: ["name", "age", "role", "demographic", "psychographics", "painPoints", "motivators", "preferredChannels", "keyMessage"]
      }
    }
  },
  required: ["personas"]
};

// New Persona Card Component
const PersonaCard = ({ persona, index }) => (
  <div 
    className="rounded-xl shadow-lg p-6 border flex flex-col space-y-4"
    style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
  >
    <div className="text-center">
      <div 
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white"
        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
      >
        {persona.name.charAt(0)}
      </div>
      <h3 className="text-xl font-bold mt-4" style={{ color: THEME_COLORS.textPrimary }}>
        {persona.name}, {persona.age}
      </h3>
      <p className="font-medium" style={{ color: THEME_COLORS.accentPrimary }}>
        {persona.role}
      </p>
      <p className="text-sm mt-1" style={{ color: THEME_COLORS.textSecondary }}>
        {persona.demographic}
      </p>
    </div>
    
    <PersonaDetailList title="Pain Points" items={persona.painPoints} />
    <PersonaDetailList title="Motivators" items={persona.motivators} />
    <PersonaDetailList title="Preferred Channels" items={persona.preferredChannels} />
    
    <div>
      <h4 className="font-semibold mb-2" style={{ color: THEME_COLORS.textPrimary }}>Key Message</h4>
      <p 
        className="text-sm p-3 rounded-lg" 
        style={{ 
          backgroundColor: `${THEME_COLORS.accentSecondary}20`, 
          color: THEME_COLORS.textSecondary 
        }}
      >
        {persona.keyMessage}
      </p>
    </div>
  </div>
);

const PersonaDetailList = ({ title, items }) => (
  <div>
    <h4 className="font-semibold mb-2" style={{ color: THEME_COLORS.textPrimary }}>{title}</h4>
    <ul className="list-disc list-inside space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm" style={{ color: THEME_COLORS.textSecondary }}>{item}</li>
      ))}
    </ul>
  </div>
);


const PersonaArchitectTab = ({ apiKey, onError }) => {
  const [inputs, setInputs] = useState({ product: '', location: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleGenerate = async () => {
    if (!apiKey) {
      onError('Please set your API Key in the Welcome tab first.');
      return;
    }
    setIsLoading(true);
    setResult(null);

    const textPrompt = `
      Act as a senior market researcher. Generate 3 distinct, deep-dive marketing personas for a company selling "${inputs.product}" in "${inputs.location}".
      For each persona, find real, data-backed psychographics, pain points, motivations, media consumption habits, and a key persuasive message.
      Ensure the personas are distinct and realistic for the specified location.
    `;

    try {
      const data = await fetchGroundedJson(apiKey, textPrompt, personaArchitectSchema, setLoadingMessage);
      setResult(data);
    } catch (err) {
      console.error(err);
      onError(err.message || 'Failed to generate personas.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold" style={{ color: THEME_COLORS.textPrimary }}>Persona Architect</h2>
      
      {/* Input Form */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-xl shadow-lg border"
        style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
      >
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Product / Service</label>
          <StyledInput name="product" value={inputs.product} onChange={handleInputChange} placeholder="e.g., E-Scooters" />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Target Location</label>
          <StyledInput name="location" value={inputs.location} onChange={handleInputChange} placeholder="e.g., Mumbai" />
        </div>
        <div className="md:col-span-1 flex items-end">
          <StyledButton onClick={handleGenerate} disabled={isLoading} className="w-full" isLoading={isLoading}>
            Generate Personas
          </StyledButton>
        </div>
      </div>

      {/* Output Section */}
      {isLoading && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size={48} />
          <p className="ml-4 text-xl" style={{ color: THEME_COLORS.textSecondary }}>
            {loadingMessage || 'Generating...'}
          </p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {result.personas.map((persona, index) => (
            <PersonaCard key={index} persona={persona} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};


// --- Tab 3: Market Position Analyzer ---

const marketAnalyzerSchema = {
  type: "OBJECT",
  properties: {
    culturalInsights: { type: "STRING" },
    culturalValueAlignment: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          trait: { type: "STRING" },
          alignment: { type: "STRING" },
          implication: { type: "STRING" }
        }
      }
    },
    marketSentiment: {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        positive: { type: "NUMBER" },
        neutral: { type: "NUMBER" },
        negative: { type: "NUMBER" }
      }
    },
    recommendations: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    performanceBenchmarks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          metric: { type: "STRING" },
          yourBrand: { type: "NUMBER" },
          industryAverage: { type: "NUMBER" }
        }
      }
    },
    consumerSentimentAnalysis: { type: "STRING" },
    keyCulturalThemes: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    brandPerformanceRadar: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING" },
            A: { type: "NUMBER" },
            fullMark: { type: "NUMBER" }
          }
        }
    },
    regionalPerformance: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          region: { type: "STRING" },
          sentiment: { type: "STRING", enum: ["Positive", "Neutral", "Negative"] },
          summary: { type: "STRING" }
        }
      }
    },
    competitorBenchmarks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          metric: { type: "STRING" },
          yourBrand: { type: "NUMBER" },
          competitor1: { type: "NUMBER" },
          competitor2: { type: "NUMBER" }
        }
      }
    }
  },
  required: [
    "culturalInsights", "culturalValueAlignment", "marketSentiment", 
    "recommendations", "performanceBenchmarks", "consumerSentimentAnalysis",
    "keyCulturalThemes", "brandPerformanceRadar", "regionalPerformance", 
    "competitorBenchmarks"
  ]
};


const MarketPositionAnalyzerTab = ({ apiKey, onError }) => {
  const [inputs, setInputs] = useState({
    companyName: '',
    website: '',
    location: '',
    product: '',
    competitors: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateAnalysis = async () => {
    if (!apiKey) {
      onError('Please set your API Key in the Welcome tab first.');
      return;
    }
    setIsLoading(true);
    setResult(null);

    const searchTextPrompt = `
      Analyze the market position for:
      - Company: ${inputs.companyName} (${inputs.website})
      - Location: ${inputs.location}
      - Product: ${inputs.product}
      - Competitors: ${inputs.competitors}

      Provide a detailed, text-based report covering:
      1.  Cultural Insights: Key cultural nuances in ${inputs.location} relevant to ${inputs.product}.
      2.  Cultural Value Alignment: (e.g., Trait: Aspiration, Alignment: High, Implication: Strong appeal)
      3.  Market Sentiment Analysis: Overall sentiment with estimated percentages (e.g., 70% positive).
      4.  Recommendations: 3-5 actionable recommendations.
      5.  Performance Benchmarks: Estimated Brand Awareness and Purchase Intent vs. industry average (e.g., Brand Awareness: 40% vs Industry 45%).
      6.  Consumer Sentiment Analysis: Deeper dive into what consumers are saying.
      7.  Key Cultural Themes: Top 3 cultural themes to leverage.
      8.  Brand Performance Radar: 5 subjects (e.g., 'Innovation', 'Trust') and scores out of 100.
      9.  Regional Performance: 4-6 key cities/regions in '${inputs.location}' and their sentiment.
      10. Competitor Benchmarks: Compare '${inputs.companyName}' against '${inputs.competitors}' on 2-3 key metrics.
    `;

    try {
      const data = await fetchGroundedJson(apiKey, searchTextPrompt, marketAnalyzerSchema, setLoadingMessage);
      setResult(data);
    } catch (err) {
      console.error(err);
      onError(err.message || 'Failed to generate analysis.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const getSentimentStyle = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return { icon: <Smile style={{ color: THEME_COLORS.success }} />, color: THEME_COLORS.success, text: THEME_COLORS.textPrimary };
      case 'neutral':
        return { icon: <Meh style={{ color: THEME_COLORS.accentTertiary }} />, color: THEME_COLORS.accentTertiary, text: THEME_COLORS.textPrimary };
      case 'negative':
        return { icon: <Frown style={{ color: THEME_COLORS.error }} />, color: THEME_COLORS.error, text: THEME_COLORS.textPrimary };
      default:
        return { icon: <Meh style={{ color: THEME_COLORS.textSecondary }} />, color: THEME_COLORS.textSecondary, text: THEME_COLORS.textSecondary };
    }
  };

  const sentimentPieData = useMemo(() => {
    if (!result?.marketSentiment) return [];
    return [
      { name: 'Positive', value: result.marketSentiment.positive },
      { name: 'Neutral', value: result.marketSentiment.neutral },
      { name: 'Negative', value: result.marketSentiment.negative },
    ];
  }, [result]);


  const PIE_COLORS = [THEME_COLORS.success, THEME_COLORS.accentTertiary, THEME_COLORS.error];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold" style={{ color: THEME_COLORS.textPrimary }}>Market Position Analyzer</h2>
      
      {/* Input Form */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl shadow-lg border"
        style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
      >
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Company Name</label>
          <StyledInput name="companyName" value={inputs.companyName} onChange={handleInputChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Company Website</label>
          <StyledInput name="website" value={inputs.website} onChange={handleInputChange} placeholder="https://company.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Location (Country/City)</label>
          <StyledInput name="location" value={inputs.location} onChange={handleInputChange} placeholder="e.g., Brazil" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Product / Service</label>
          <StyledInput name="product" value={inputs.product} onChange={handleInputChange} placeholder="e.g., luxury electric vehicles" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Competitors (comma-separated)</label>
          <StyledInput name="competitors" value={inputs.competitors} onChange={handleInputChange} placeholder="e.g., Tesla, Rivian" />
        </div>
        <div className="md:col-span-2">
          <StyledButton onClick={handleGenerateAnalysis} disabled={isLoading} className="w-full" isLoading={isLoading}>
            Generate Analysis
          </StyledButton>
        </div>
      </div>

      {/* Output Section */}
      {isLoading && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size={48} />
          <p className="ml-4 text-xl" style={{ color: THEME_COLORS.textSecondary }}>{loadingMessage || 'Analyzing...'}</p>
        </div>
      )}

      {result && (
        <div className="space-y-8">
          
          <div 
            className="rounded-xl shadow-lg p-8 border space-y-6"
            style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
          >
            <h3 className="text-2xl font-semibold" style={{ color: THEME_COLORS.textPrimary }}>
              AI-Generated Market Analysis
            </h3>
            
            <div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: THEME_COLORS.accentPrimary }}>Cultural Insights</h4>
              <p style={{ color: THEME_COLORS.textSecondary }}>{result.culturalInsights}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: THEME_COLORS.accentPrimary }}>Market Sentiment Analysis</h4>
              <div className="flex items-center space-x-4 mb-2">
                {getSentimentStyle(sentimentPieData.find(s => s.value === Math.max(...sentimentPieData.map(s => s.value)))?.name).icon}
                <div className="flex space-x-4" style={{ color: THEME_COLORS.textSecondary }}>
                  <span className="flex items-center"><Smile size={18} className="mr-1" style={{ color: THEME_COLORS.success }} /> {result.marketSentiment.positive}% Positive</span>
                  <span className="flex items-center"><Meh size={18} className="mr-1" style={{ color: THEME_COLORS.accentTertiary }} /> {result.marketSentiment.neutral}% Neutral</span>
                  <span className="flex items-center"><Frown size={18} className="mr-1" style={{ color: THEME_COLORS.error }} /> {result.marketSentiment.negative}% Negative</span>
                </div>
              </div>
              <p style={{ color: THEME_COLORS.textSecondary }}>{result.marketSentiment.summary}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: THEME_COLORS.accentPrimary }}>Consumer Sentiment Analysis</h4>
              <p style={{ color: THEME_COLORS.textSecondary }}>{result.consumerSentimentAnalysis}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: THEME_COLORS.accentPrimary }}>Key Cultural Themes</h4>
              <ul className="list-disc list-inside space-y-1" style={{ color: THEME_COLORS.textSecondary }}>
                {result.keyCulturalThemes.map(theme => <li key={theme}>{theme}</li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: THEME_COLORS.accentPrimary }}>Recommendations</h4>
              <ul className="list-decimal list-inside space-y-1" style={{ color: THEME_COLORS.textSecondary }}>
                {result.recommendations.map(rec => <li key={rec}>{rec}</li>)}
              </ul>
            </div>
          </div>

          <div 
            className="rounded-xl shadow-lg p-8 border"
            style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
          >
            <h3 className="text-2xl font-semibold mb-4" style={{ color: THEME_COLORS.textPrimary }}>
              Cultural Value Alignment
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y" style={{ divideColor: THEME_COLORS.border }}>
                <thead style={{ backgroundColor: THEME_COLORS.background }}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: THEME_COLORS.textSecondary }}>Cultural Value / Trait</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: THEME_COLORS.textSecondary }}>Brand Alignment</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: THEME_COLORS.textSecondary }}>Implication for Success</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: THEME_COLORS.border }}>
                  {result.culturalValueAlignment.map((item) => (
                    <tr key={item.trait}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: THEME_COLORS.textPrimary }}>{item.trait}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: THEME_COLORS.textSecondary }}>{item.alignment}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: THEME_COLORS.textSecondary }}>{item.implication}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* Charts Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer title="Market Sentiment">
              <PieChart>
                <Pie data={sentimentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill={THEME_COLORS.accentPrimary} label={{ fill: THEME_COLORS.textPrimary }}>
                  {sentimentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                  itemStyle={{ color: THEME_COLORS.textPrimary }}
                />
                <Legend wrapperStyle={{ color: THEME_COLORS.textSecondary }} />
              </PieChart>
            </ChartContainer>

            <ChartContainer title="Performance Benchmarks">
              <BarChart data={result.performanceBenchmarks}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
                <XAxis dataKey="metric" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <YAxis stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                  itemStyle={{ color: THEME_COLORS.textPrimary }}
                />
                <Legend wrapperStyle={{ color: THEME_COLORS.textSecondary }} />
                <Bar dataKey="yourBrand" name="Your Brand" fill={THEME_COLORS.accentPrimary} />
                <Bar dataKey="industryAverage" name="Industry Average" fill={THEME_COLORS.accentTertiary} />
              </BarChart>
            </ChartContainer>

            <ChartContainer title="Brand Performance Radar">
              <RadarChart cx="50%" cy="50%" outerRadius={100} data={result.brandPerformanceRadar}>
                <PolarGrid stroke={THEME_COLORS.border} />
                <PolarAngleAxis dataKey="subject" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={THEME_COLORS.border} tick={{ fill: THEME_COLORS.textSecondary }} />
                <Radar name="Your Brand" dataKey="A" stroke={THEME_COLORS.accentPrimary} fill={THEME_COLORS.accentPrimary} fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                  itemStyle={{ color: THEME_COLORS.textPrimary }}
                />
              </RadarChart>
            </ChartContainer>

            {/* MODIFICATION HERE: Replaced heatmap with a color-coded table */}
            <div 
              className="rounded-xl shadow-lg p-6 border lg:col-span-1" // Use full chart container styling but allow it to size by content
              style={{ 
                backgroundColor: THEME_COLORS.cardBackground,
                borderColor: THEME_COLORS.border 
              }}
            >
              <h3 
                className="text-xl font-semibold mb-4"
                style={{ color: THEME_COLORS.textPrimary }}
              >
                Regional Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ divideColor: THEME_COLORS.border }}>
                  <thead style={{ backgroundColor: THEME_COLORS.background }}>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: THEME_COLORS.textSecondary }}>Region</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: THEME_COLORS.textSecondary }}>Sentiment</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: THEME_COLORS.textSecondary }}>Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: THEME_COLORS.border }}>
                    {result.regionalPerformance.map((item) => {
                      const { icon, color } = getSentimentStyle(item.sentiment);
                      return (
                        <tr key={item.region}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: THEME_COLORS.textPrimary }}>{item.region}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: color }}>
                            <div className="flex items-center">
                              {React.cloneElement(icon, { size: 18, className: "mr-2" })}
                              {item.sentiment}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: THEME_COLORS.textSecondary, whiteSpace: 'normal' }}>{item.summary}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* END MODIFICATION */}

            <ChartContainer title="Competitor Benchmark">
              <BarChart data={result.competitorBenchmarks}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
                <XAxis dataKey="metric" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <YAxis stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                  itemStyle={{ color: THEME_COLORS.textPrimary }}
                />
                <Legend wrapperStyle={{ color: THEME_COLORS.textSecondary }} />
                <Bar dataKey="yourBrand" name="Your Brand" fill={THEME_COLORS.accentPrimary} />
                <Bar dataKey="competitor1" name={inputs.competitors.split(',')[0]?.trim() || 'Competitor 1'} fill={THEME_COLORS.accentSecondary} />
                <Bar dataKey="competitor2" name={inputs.competitors.split(',')[1]?.trim() || 'Competitor 2'} fill={THEME_COLORS.accentTertiary} />
              </BarChart>
            </ChartContainer>
            
            <ChartContainer title="Sentiment & Engagement Trend (Illustrative)">
              <LineChart data={[
                  { name: 'Jan', 'Sentiment Score': 60, 'Engagement Rate': 2.5 },
                  { name: 'Feb', 'Sentiment Score': 62, 'Engagement Rate': 2.6 },
                  { name: 'Mar', 'Sentiment Score': 65, 'Engagement Rate': 2.8 },
                  { name: 'Apr', 'Sentiment Score': 63, 'Engagement Rate': 2.7 },
                  { name: 'May', 'Sentiment Score': 68, 'Engagement Rate': 3.0 },
                  { name: 'Jun', 'Sentiment Score': 72, 'Engagement Rate': 3.2 },
                ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
                <XAxis dataKey="name" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <YAxis yAxisId="left" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <YAxis yAxisId="right" orientation="right" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                  itemStyle={{ color: THEME_COLORS.textPrimary }}
                />
                <Legend wrapperStyle={{ color: THEME_COLORS.textSecondary }} />
                <Line yAxisId="left" type="monotone" dataKey="Sentiment Score" stroke={THEME_COLORS.accentPrimary} activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="Engagement Rate" stroke={THEME_COLORS.accentSecondary} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Tab 4: Campaign Forge ---
const campaignSchema = {
  type: "OBJECT",
  properties: {
    strategy: { type: "STRING" },
    rationale: { type: "STRING" },
    kpis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          metric: { type: "STRING" },
          value: { type: "STRING" }
        }
      }
    },
    framework: {
      type: "OBJECT",
      properties: {
        coreMessage: { type: "STRING" },
        channelStrategy: { type: "STRING" },
        contentCalendar: { type: "STRING" },
        riskMitigation: { type: "STRING" }
      }
    },
    concepts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "NUMBER" },
          title: { type: "STRING" },
          summary: { type: "STRING" },
          visualIdea: { type: "STRING" }
        }
      }
    }
  },
  required: ["strategy", "rationale", "kpis", "framework", "concepts"]
};

const CampaignForgeTab = ({ apiKey, onError }) => {
  const [inputs, setInputs] = useState({
    companyName: '',
    website: '',
    country: '',
    city: '',
    imageURL: '',
  });
  const [isStrategyLoading, setIsStrategyLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  const [strategyResult, setStrategyResult] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateStrategy = async () => {
    if (!apiKey) {
      onError('Please set your API Key in the Welcome tab first.');
      return;
    }
    setIsStrategyLoading(true);
    setStrategyResult(null);
    setSelectedConcept(null);
    setGeneratedImages([]);

    const searchTextPrompt = `
      Create a full campaign strategy for:
      - Company: ${inputs.companyName} (${inputs.website})
      - Target: ${inputs.city}, ${inputs.country}
      - Reference Image (Optional): ${inputs.imageURL}

      Provide a detailed text report covering:
      1.  strategy: A brief campaign strategy.
      2.  rationale: The rationale behind it.
      3.  kpis: A list of 3-4 conservative KPI estimations (e.g., Brand Awareness Lift: 5-10%).
      4.  framework: Details for coreMessage, channelStrategy, contentCalendar, and riskMitigation.
      5.  concepts: A list of 6 distinct campaign concepts. Each concept should have a title, summary, and a visualIdea (a short description for an image generator).
    `;
    
    try {
      const data = await fetchGroundedJson(apiKey, searchTextPrompt, campaignSchema, setLoadingMessage);
      // Assign sequential IDs if not provided
      data.concepts = data.concepts.map((concept, index) => ({ ...concept, id: concept.id || index + 1 }));
      setStrategyResult(data);
    } catch (err) {
      console.error(err);
      onError(err.message || 'Failed to generate strategy.');
    } finally {
      setIsStrategyLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateImages = async () => {
    if (!apiKey || !selectedConcept) {
      onError('Please select a concept first.');
      return;
    }
    setIsImageLoading(true);
    setGeneratedImages([]);

    const imagePrompt = `
      Create a high-quality, visually appealing campaign image for an ad.
      The campaign is for: ${inputs.companyName}
      The concept is: ${selectedConcept.title}.
      Visual Idea: ${selectedConcept.visualIdea}.
      Target location: ${inputs.city}, ${inputs.country}.
      Style: Modern, professional, tech-focused, dark theme.
      Use a color palette of deep purple, indigo, bright violet, and white text.
    `;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt: imagePrompt }],
      parameters: { sampleCount: 2 }
    };

    try {
      const data = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const images = data.predictions?.map(
        (pred) => `data:image/png;base64,${pred.bytesBase64Encoded}`
      );
      
      if (images && images.length > 0) {
        setGeneratedImages(images);
      } else {
        throw new Error('No images returned from API.');
      }
    } catch (err) {
      console.error(err);
      onError(err.message || 'Failed to generate images.');
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleConceptClick = (concept) => {
    setSelectedConcept(concept);
    setGeneratedImages([]); // Clear old images
    const detailElement = document.getElementById('concept-detail');
    if (detailElement) {
      detailElement.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const strategyChartData = useMemo(() => ({
    channel: [
      { name: 'Social Media', value: 40 },
      { name: 'Search (SEM)', value: 25 },
      { name: 'OOH (Digital)', value: 15 },
      { name: 'Influencer', value: 20 },
    ],
    audience: [
      { name: 'Gen Z (18-24)', value: 30 },
      { name: 'Millennials (25-39)', value: 45 },
      { name: 'Gen X+ (40+)', value: 25 },
    ],
  }), []);


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold" style={{ color: THEME_COLORS.textPrimary }}>Campaign Forge</h2>

      {/* Input Form */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl shadow-lg border"
        style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
      >
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Company Name</label>
          <StyledInput name="companyName" value={inputs.companyName} onChange={handleInputChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Company Website</label>
          <StyledInput name="website" value={inputs.website} onChange={handleInputChange} placeholder="https://company.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Target Country</label>
          <StyledInput name="country" value={inputs.country} onChange={handleInputChange} placeholder="e.g., India" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Target City</label>
          <StyledInput name="city" value={inputs.city} onChange={handleInputChange} placeholder="e.g., Mumbai" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1" style={{ color: THEME_COLORS.textSecondary }}>Optional: Current Campaign Image URL</label>
          <StyledInput name="imageURL" value={inputs.imageURL} onChange={handleInputChange} placeholder="https://.../image.png" />
        </div>
        <div className="md:col-span-2">
          <StyledButton onClick={handleGenerateStrategy} disabled={isStrategyLoading} className="w-full" isLoading={isStrategyLoading}>
            Generate Strategy & Concepts
          </StyledButton>
        </div>
      </div>
      
      {isStrategyLoading && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size={48} />
          <p className="ml-4 text-xl" style={{ color: THEME_COLORS.textSecondary }}>{loadingMessage || 'Forging your campaign...'}</p>
        </div>
      )}

      {/* Strategy Output */}
      {strategyResult && (
        <div className="space-y-8">
          
          <div 
            className="rounded-xl shadow-lg p-8 border"
            style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
          >
            <h3 className="text-2xl font-semibold mb-4" style={{ color: THEME_COLORS.textPrimary }}>
              Your AI-Generated Campaign Strategy
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Campaign Strategy</h4>
                <p style={{ color: THEME_COLORS.textSecondary }}>{strategyResult.strategy}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Rationale</h4>
                <p style={{ color: THEME_COLORS.textSecondary }}>{strategyResult.rationale}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Conservative KPI Estimations</h4>
                <ul className="list-disc list-inside" style={{ color: THEME_COLORS.textSecondary }}>
                  {strategyResult.kpis.map(kpi => (
                    <li key={kpi.metric}><strong style={{ color: THEME_COLORS.textPrimary }}>{kpi.metric}:</strong> {kpi.value}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div 
              className="rounded-xl shadow-lg p-8 border space-y-4"
              style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
            >
              <h3 className="text-2xl font-semibold mb-4" style={{ color: THEME_COLORS.textPrimary }}>
                Strategic Framework
              </h3>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Core Message</h4>
                <p style={{ color: THEME_COLORS.textSecondary }}>{strategyResult.framework.coreMessage}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Channel Strategy</h4>
                <p style={{ color: THEME_COLORS.textSecondary }}>{strategyResult.framework.channelStrategy}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Content Calendar</h4>
                <p style={{ color: THEME_COLORS.textSecondary }}>{strategyResult.framework.contentCalendar}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: THEME_COLORS.accentPrimary }}>Risk Mitigation</h4>
                <p style={{ color: THEME_COLORS.textSecondary }}>{strategyResult.framework.riskMitigation}</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <ChartContainer title="Channel Performance (Illustrative)">
                <BarChart data={strategyChartData.channel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
                  <XAxis type="number" stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                  <YAxis type="category" dataKey="name" width={100} stroke={THEME_COLORS.textSecondary} tick={{ fill: THEME_COLORS.textSecondary }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                    itemStyle={{ color: THEME_COLORS.textPrimary }}
                  />
                  <Bar dataKey="value" fill={THEME_COLORS.accentPrimary} />
                </BarChart>
              </ChartContainer>
              
              <ChartContainer title="Audience Segmentation (Illustrative)">
                <PieChart>
                  <Pie data={strategyChartData.audience} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill={THEME_COLORS.accentPrimary} label={{ fill: THEME_COLORS.textPrimary }}>
                    {strategyChartData.audience.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[THEME_COLORS.accentPrimary, THEME_COLORS.accentSecondary, THEME_COLORS.accentTertiary][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
                    itemStyle={{ color: THEME_COLORS.textPrimary }}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          </div>
          
          <div 
            className="rounded-xl shadow-lg p-8 border"
            style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
          >
            <h3 className="text-2xl font-semibold mb-6" style={{ color: THEME_COLORS.textPrimary }}>
              6 AI-Generated Campaign Concepts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategyResult.concepts.map(concept => (
                <button
                  key={concept.id}
                  onClick={() => handleConceptClick(concept)}
                  className="p-6 rounded-lg border-2 text-left transition-all"
                  style={{
                    backgroundColor: THEME_COLORS.background,
                    borderColor: selectedConcept?.id === concept.id ? THEME_COLORS.accentPrimary : THEME_COLORS.border,
                    boxShadow: selectedConcept?.id === concept.id ? `0 0 0 2px ${THEME_COLORS.accentPrimary}80` : 'none'
                  }}
                >
                  <h4 className="text-lg font-bold" style={{ color: THEME_COLORS.textPrimary }}>{concept.title}</h4>
                  <p className="text-sm mt-2" style={{ color: THEME_COLORS.textSecondary }}>{concept.summary}</p>
                </button>
              ))}
            </div>
          </div>
          
          {selectedConcept && (
            <div 
              id="concept-detail" 
              className="rounded-xl shadow-lg p-8 border"
              style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
            >
              <h3 className="text-2xl font-semibold mb-4" style={{ color: THEME_COLORS.textPrimary }}>
                Concept Detail: <span style={{ color: THEME_COLORS.accentPrimary }}>{selectedConcept.title}</span>
              </h3>
              <p className="mb-4" style={{ color: THEME_COLORS.textSecondary }}>{selectedConcept.summary}</p>
              <div className="p-4 rounded-lg" style={{ backgroundColor: THEME_COLORS.background }}>
                <p className="font-semibold" style={{ color: THEME_COLORS.textPrimary }}>Visual Idea:</p>
                <p className="italic" style={{ color: THEME_COLORS.textSecondary }}>"{selectedConcept.visualIdea}"</p>
              </div>
              
              <StyledButton onClick={handleGenerateImages} disabled={isImageLoading} className="mt-6" isLoading={isImageLoading}>
                <ImageIcon size={18} className="mr-2" />
                Generate Campaign Images (2)
              </StyledButton>
              
              {isImageLoading && (
                <div className="flex justify-center items-center p-12">
                  <LoadingSpinner size={48} />
                  <p className="ml-4 text-xl" style={{ color: THEME_COLORS.textSecondary }}>Generating images...</p>
                </div>
              )}
              
              {generatedImages.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-xl font-semibold mb-4" style={{ color: THEME_COLORS.textPrimary }}>Generated Images</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generatedImages.map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`Generated campaign image ${index + 1}`}
                        className="rounded-lg shadow-md w-full object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

// --- Tab 5: Pricing ---
const PricingCard = ({ plan, price, features, isFeatured = false }) => (
  <div 
    className={`p-8 rounded-2xl border ${isFeatured ? 'shadow-2xl scale-105' : 'shadow-lg'}`}
    style={{
      backgroundColor: isFeatured ? THEME_COLORS.accentPrimary : THEME_COLORS.cardBackground,
      borderColor: isFeatured ? THEME_COLORS.accentPrimary : THEME_COLORS.border,
      color: isFeatured ? 'white' : THEME_COLORS.textPrimary,
    }}
  >
    <h3 className="text-2xl font-semibold">{plan}</h3>
    <p className="mt-2 text-4xl font-bold">
      {price}
      {price.startsWith('$') && 
        <span className={`text-sm font-medium ${isFeatured ? 'text-purple-100' : 'text-gray-400'}`}>/mo</span>
      }
    </p>
    <ul className={`mt-6 space-y-3 ${isFeatured ? 'text-purple-50' : ''}`}
        style={{ color: isFeatured ? 'white' : THEME_COLORS.textSecondary }}
    >
      {features.map((feature, index) => (
        <li key={index} className="flex items-center space-x-3">
          <Check size={20} style={{ color: isFeatured ? 'white' : THEME_COLORS.success }} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <StyledButton
      className="w-full mt-8"
      style={{
        backgroundColor: isFeatured ? 'white' : THEME_COLORS.accentSecondary,
        color: isFeatured ? THEME_COLORS.accentPrimary : 'white',
        '--tw-ring-color': isFeatured ? 'white' : THEME_COLORS.accentSecondary,
        '--tw-ring-offset-color': isFeatured ? THEME_COLORS.accentPrimary : THEME_COLORS.cardBackground
      }}
    >
      {plan === 'Enterprise' ? 'Contact Us' : 'Get Started'}
    </StyledButton>
  </div>
);

const PricingTab = () => {
  const plans = [
    {
      plan: 'Starter',
      price: '$99',
      features: ['1 User', '10 Market Analyses', '5 Campaign Forges', 'Email Support'],
    },
    {
      plan: 'Pro',
      price: '$299',
      features: ['5 Users', '50 Market Analyses', '25 Campaign Forges', 'Priority Support', 'API Access'],
      isFeatured: true,
    },
    {
      plan: 'Enterprise',
      price: 'Contact Us',
      features: ['Unlimited Users', 'Unlimited Analyses', 'Custom Integrations', 'Dedicated Strategist'],
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center" style={{ color: THEME_COLORS.textPrimary }}>
        Simple, Transparent Pricing
      </h2>
      <p className="text-xl text-center max-w-2xl mx-auto" style={{ color: THEME_COLORS.textSecondary }}>
        Choose the plan that's right for your team and start building
        smarter campaigns today.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto pt-8">
        {plans.map((plan) => (
          <PricingCard key={plan.plan} {...plan} />
        ))}
      </div>
    </div>
  );
};

// --- Tab 6: About Us ---
const AboutUsTab = () => {
  return (
    <div 
      className="max-w-3xl mx-auto p-10 rounded-xl shadow-lg border"
      style={{ backgroundColor: THEME_COLORS.cardBackground, borderColor: THEME_COLORS.border }}
    >
      <h2 className="text-3xl font-bold text-center mb-6" style={{ color: THEME_COLORS.textPrimary }}>
        About Us
      </h2>
      <div className="text-center mb-8">
        <img
          src={`https://placehold.co/128x128/${THEME_COLORS.accentPrimary.substring(1)}/FFFFFF?text=YK`}
          alt="Yash Kapadia"
          className="w-32 h-32 rounded-full mx-auto shadow-md border-4"
          style={{ borderColor: THEME_COLORS.cardBackground }}
        />
        <h3 className="text-2xl font-semibold mt-4" style={{ color: THEME_COLORS.textPrimary }}>Yash Kapadia</h3>
        <p className="font-medium" style={{ color: THEME_COLORS.accentPrimary }}>IIM Ahmedabad</p>
      </div>
      <p className="leading-relaxed text-lg text-center" style={{ color: THEME_COLORS.textSecondary }}>
        This tool was developed by Yash Kapadia, a student at IIM
        Ahmedabad, as part of the 'GenAI in Marketing' course. 'Naya Daur'
        is a project dedicated to exploring the practical intersection of
        artificial intelligence and modern marketing strategy, providing
        tools that are both insightful and actionable.
      </p>
    </div>
  );
};


// --- Main App Component ---

const AppHeader = ({ activeTab, onTabClick }) => {
  const tabs = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { id: 'persona', label: 'Persona Architect', icon: Users }, // ADDED
    { id: 'analyzer', label: 'Market Analyzer', icon: Target },
    { id: 'forge', label: 'Campaign Forge', icon: WandSparkles },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'about', label: 'About Us', icon: Info },
  ];

  return (
    <header 
      className="shadow-md sticky top-0 z-40 border-b"
      style={{ 
        backgroundColor: `${THEME_COLORS.cardBackground}E6`, // Translucent
        borderColor: THEME_COLORS.border,
        backdropFilter: 'blur(10px)'
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Bot size={32} style={{ color: THEME_COLORS.accentPrimary }} />
            <span className="ml-3 text-2xl font-bold" style={{ color: THEME_COLORS.textPrimary }}>Naya Daur</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex md:space-x-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? THEME_COLORS.accentPrimary : 'transparent',
                  color: activeTab === tab.id ? 'white' : THEME_COLORS.textSecondary,
                  fontWeight: activeTab === tab.id ? '600' : '500'
                }}
              >
                <tab.icon size={18} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Mobile Nav (Placeholder) */}
          <div className="md:hidden">
            <span style={{ color: THEME_COLORS.textSecondary }}>Menu</span>
          </div>
        </div>
      </nav>
    </header>
  );
};


export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('welcome');
  const [error, setError] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, [apiKey]);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    setShowApiKeyModal(false);
    if (activeTab === 'welcome') {
      setActiveTab('persona'); // Move to new first tab
    }
  };

  const handleError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Auto-dismiss error
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'welcome':
        return <WelcomeTab onApiKeySave={handleSaveApiKey} />;
      case 'persona': // ADDED
        return <PersonaArchitectTab apiKey={apiKey} onError={handleError} />;
      case 'analyzer':
        return <MarketPositionAnalyzerTab apiKey={apiKey} onError={handleError} />;
      case 'forge':
        return <CampaignForgeTab apiKey={apiKey} onError={handleError} />;
      case 'pricing':
        return <PricingTab />;
      case 'about':
        return <AboutUsTab />;
      default:
        return <WelcomeTab onApiKeySave={handleSaveApiKey} />;
    }
  };

  return (
    <div 
      className="min-h-screen font-sans relative"
      style={{ 
        color: THEME_COLORS.textPrimary,
        // Apply the radial gradient from the image
        background: `radial-gradient(circle at 90% 40%, ${THEME_COLORS.accentTertiary} 0%, ${THEME_COLORS.background} 35%)`
      }}
    >
      <div className="relative z-10">
        <AppHeader activeTab={activeTab} onTabClick={setActiveTab} />
        
        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {renderTabContent()}
        </main>

        <Modal isOpen={showApiKeyModal && activeTab !== 'welcome'} onClose={() => {}}>
          <WelcomeTab onApiKeySave={handleSaveApiKey} />
        </Modal>

        <ErrorToast message={error} onClose={() => setError(null)} />
      </div>
    </div>
  );
}