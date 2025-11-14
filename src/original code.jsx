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
  Smile, // Added
  Meh,   // Added
  Frown  // Added
} from 'lucide-react';

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
      
      // MODIFIED: Try to get detailed error message from response body
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


// --- Reusable UI Components ---

const StyledInput = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${className}`}
    {...props}
  />
));

const StyledButton = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyle = 'px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full m-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
    <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white p-4 rounded-lg shadow-lg flex items-center">
      <AlertTriangle size={24} className="mr-3" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-red-100">
        <X size={20} />
      </button>
    </div>
  );
};

const LoadingSpinner = ({ size = 24 }) => (
  <Loader2 size={size} className="animate-spin text-indigo-600" />
);

const ChartContainer = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  </div>
);

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4 border border-gray-100">
    <div className="p-3 bg-indigo-100 rounded-full">
      {React.cloneElement(icon, { size: 24, className: "text-indigo-600" })}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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
        <h1 className="text-5xl font-extrabold text-gray-900">
          Welcome to <span className="text-indigo-600">Naya Daur</span>
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Ushering in a New Era of AI-Powered Marketing
        </p>
      </div>

      {/* API Key Input */}
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Activate Your Dashboard
        </h2>
        <div className="flex items-center space-x-3">
          <KeyRound size={24} className="text-gray-400" />
          <StyledInput
            type="password"
            placeholder="Enter your Gemini API Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <StyledButton onClick={handleSave} className="w-full mt-4">
          <Check size={20} className="inline-block mr-2" />
          Save and Activate
        </StyledButton>
      </div>

      {/* Vision */}
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Our Vision: Ushering in a New Era of Marketing
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Naya Daur (meaning 'New Era') was built on the belief that
          Generative AI can democratize strategic marketing. Our vision is to
          empower businesses of all sizes to understand complex markets,
          connect with cultures, and forge highly effective campaigns with
          the power of AI.
        </p>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
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
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Trusted By
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
          {[
            'InnovateCorp',
            'BharatBoost',
            'GlobalTech Solutions',
            'Aura Consumer Goods',
          ].map((name) => (
            <span key={name} className="text-xl font-semibold text-gray-500">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Tab 2: Market Position Analyzer ---

// NEW: Define the JSON schema we expect from the AI
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
  const [loadingMessage, setLoadingMessage] = useState(''); // NEW
  const [result, setResult] = useState(null); // Will hold the JSON object

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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // ***************************************************************
    // FIX: Perform a 2-step call to avoid the 400 error
    // ***************************************************************

    try {
      // STEP 1: Get grounded text data using Google Search
      setLoadingMessage('Analyzing market data...');
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

      const searchPayload = {
        contents: [{ parts: [{ text: searchTextPrompt }] }],
        tools: [{ "google_search": {} }],
      };

      const searchData = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
      });

      const groundedText = searchData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!groundedText) {
        throw new Error('Step 1 Failed: No content returned from market analysis.');
      }

      // STEP 2: Parse the grounded text into the required JSON schema
      setLoadingMessage('Formatting results...');
      
      const parseJsonPrompt = `
        Parse the following market analysis text and convert it into a valid JSON object matching the provided schema.

        TEXT TO PARSE:
        ---
        ${groundedText}
        ---

        Fill all fields in the JSON schema. For 'competitorBenchmarks', use 'competitor1' and 'competitor2' as keys, deriving names from '${inputs.competitors}'.
      `;

      const jsonPayload = {
        contents: [{ parts: [{ text: parseJsonPrompt }] }],
        // NO 'tools' when 'generationConfig' is used for JSON
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: marketAnalyzerSchema
        }
      };

      const jsonData = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonPayload),
      });

      const jsonText = jsonData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const parsedJson = JSON.parse(jsonText);
        setResult(parsedJson);
      } else {
        throw new Error('Step 2 Failed: No JSON content returned from parsing.');
      }
    
    } catch (err) {
      console.error(err);
      onError(err.message || 'Failed to generate analysis.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // NEW: Helper to get sentiment color and icon
  const getSentimentStyle = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return { icon: <Smile className="text-green-500" />, color: "bg-green-500", text: "text-green-900" };
      case 'neutral':
        return { icon: <Meh className="text-yellow-500" />, color: "bg-yellow-400", text: "text-yellow-900" };
      case 'negative':
        return { icon: <Frown className="text-red-500" />, color: "bg-red-400", text: "text-red-900" };
      default:
        return { icon: <Meh className="text-gray-500" />, color: "bg-gray-400", text: "text-gray-900" };
    }
  };

  // NEW: Helper to format pie chart data
  const sentimentPieData = useMemo(() => {
    if (!result?.marketSentiment) return [];
    return [
      { name: 'Positive', value: result.marketSentiment.positive },
      { name: 'Neutral', value: result.marketSentiment.neutral },
      { name: 'Negative', value: result.marketSentiment.negative },
    ];
  }, [result]);


  const PIE_COLORS = ['#34D399', '#FBBF24', '#EF4444']; // Green, Yellow, Red

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Market Position Analyzer</h2>
      
      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <StyledInput name="companyName" value={inputs.companyName} onChange={handleInputChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
          <StyledInput name="website" value={inputs.website} onChange={handleInputChange} placeholder="https://company.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location (Country/City)</label>
          <StyledInput name="location" value={inputs.location} onChange={handleInputChange} placeholder="e.g., Brazil" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product / Service</label>
          <StyledInput name="product" value={inputs.product} onChange={handleInputChange} placeholder="e.g., luxury electric vehicles" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Competitors (comma-separated)</label>
          <StyledInput name="competitors" value={inputs.competitors} onChange={handleInputChange} placeholder="e.g., Tesla, Rivian" />
        </div>
        <div className="md:col-span-2">
          <StyledButton onClick={handleGenerateAnalysis} disabled={isLoading} className="w-full">
            {isLoading ? (
              <LoadingSpinner size={20} />
            ) : (
              'Generate Analysis'
            )}
          </StyledButton>
        </div>
      </div>

      {/* Output Section */}
      {isLoading && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size={48} />
          <p className="ml-4 text-xl text-gray-600">{loadingMessage || 'Analyzing...'}</p> {/* MODIFIED */}
        </div>
      )}

      {/* NEW: Updated render logic */}
      {result && (
        <div className="space-y-8">
          
          {/* Text Analysis Sections */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 space-y-6">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              AI-Generated Market Analysis
            </h3>
            
            {/* Cultural Insights */}
            <div>
              <h4 className="text-xl font-semibold text-indigo-600 mb-2">Cultural Insights</h4>
              <p className="text-gray-700">{result.culturalInsights}</p>
            </div>

            {/* Market Sentiment */}
            <div>
              <h4 className="text-xl font-semibold text-indigo-600 mb-2">Market Sentiment Analysis</h4>
              <div className="flex items-center space-x-4 mb-2">
                {getSentimentStyle(sentimentPieData.find(s => s.value === Math.max(...sentimentPieData.map(s => s.value)))?.name).icon}
                <div className="flex space-x-4">
                  <span className="flex items-center"><Smile size={18} className="text-green-500 mr-1" /> {result.marketSentiment.positive}% Positive</span>
                  <span className="flex items-center"><Meh size={18} className="text-yellow-500 mr-1" /> {result.marketSentiment.neutral}% Neutral</span>
                  <span className="flex items-center"><Frown size={18} className="text-red-500 mr-1" /> {result.marketSentiment.negative}% Negative</span>
                </div>
              </div>
              <p className="text-gray-700">{result.marketSentiment.summary}</p>
            </div>

            {/* Consumer Sentiment */}
            <div>
              <h4 className="text-xl font-semibold text-indigo-600 mb-2">Consumer Sentiment Analysis</h4>
              <p className="text-gray-700">{result.consumerSentimentAnalysis}</p>
            </div>

            {/* Key Cultural Themes */}
            <div>
              <h4 className="text-xl font-semibold text-indigo-600 mb-2">Key Cultural Themes</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {result.keyCulturalThemes.map(theme => <li key={theme}>{theme}</li>)}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-xl font-semibold text-indigo-600 mb-2">Recommendations</h4>
              <ul className="list-decimal list-inside text-gray-700 space-y-1">
                {result.recommendations.map(rec => <li key={rec}>{rec}</li>)}
              </ul>
            </div>
          </div>

          {/* NEW: Cultural Value Alignment Table */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Cultural Value Alignment
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cultural Value / Trait</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Alignment</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Implication for Success</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.culturalValueAlignment.map((item) => (
                    <tr key={item.trait}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.trait}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.alignment}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.implication}</td>
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
                <Pie data={sentimentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {sentimentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>

            <ChartContainer title="Performance Benchmarks">
              <BarChart data={result.performanceBenchmarks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="yourBrand" name="Your Brand" fill="#4F46E5" />
                <Bar dataKey="industryAverage" name="Industry Average" fill="#A5B4FC" />
              </BarChart>
            </ChartContainer>

            <ChartContainer title="Brand Performance Radar">
              <RadarChart cx="50%" cy="50%" outerRadius={100} data={result.brandPerformanceRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Your Brand" dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} />
              </RadarChart>
            </ChartContainer>

            {/* NEW: Dynamic Heatmap */}
            <ChartContainer title="Regional Performance Heatmap">
                <div className="flex items-center justify-center h-full">
                  <div className="grid grid-cols-3 gap-4 p-4">
                    {result.regionalPerformance.map((item) => {
                      const { icon, color, text } = getSentimentStyle(item.sentiment);
                      return (
                        <div key={item.region} className={`w-28 h-28 ${color} rounded-lg flex flex-col items-center justify-center p-2 shadow-md`}>
                          <span className={`font-bold ${text} text-center`}>{item.region}</span>
                          {icon}
                          <span className={`text-xs ${text} text-center mt-1`}>{item.summary}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
            </ChartContainer>

            <ChartContainer title="Competitor Benchmark">
              <BarChart data={result.competitorBenchmarks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="yourBrand" name="Your Brand" fill="#4F46E5" />
                <Bar dataKey="competitor1" name={inputs.competitors.split(',')[0]?.trim() || 'Competitor 1'} fill="#A5B4FC" />
                <Bar dataKey="competitor2" name={inputs.competitors.split(',')[1]?.trim() || 'Competitor 2'} fill="#C7D2FE" />
              </BarChart>
            </ChartContainer>
            
            {/* Keep illustrative trend data for now, or could ask AI for it */}
            <ChartContainer title="Sentiment & Engagement Trend (Illustrative)">
              <LineChart data={[
                  { name: 'Jan', 'Sentiment Score': 60, 'Engagement Rate': 2.5 },
                  { name: 'Feb', 'Sentiment Score': 62, 'Engagement Rate': 2.6 },
                  { name: 'Mar', 'Sentiment Score': 65, 'Engagement Rate': 2.8 },
                  { name: 'Apr', 'Sentiment Score': 63, 'Engagement Rate': 2.7 },
                  { name: 'May', 'Sentiment Score': 68, 'Engagement Rate': 3.0 },
                  { name: 'Jun', 'Sentiment Score': 72, 'Engagement Rate': 3.2 },
                ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Sentiment Score" stroke="#4F46E5" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="Engagement Rate" stroke="#34D399" />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Tab 3: Campaign Forge ---
const CampaignForgeTab = ({ apiKey, onError }) => {
  const [inputs, setInputs] = useState({
    companyName: '',
    website: '',
    country: '',
    city: '',
    imageURL: '',
  });
  const [isStrategyLoading, setIsStrategyLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(''); // NEW
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  const [strategyResult, setStrategyResult] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

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

  const handleGenerateStrategy = async () => {
    if (!apiKey) {
      onError('Please set your API Key in the Welcome tab first.');
      return;
    }
    setIsStrategyLoading(true);
    setStrategyResult(null);
    setSelectedConcept(null);
    setGeneratedImages([]);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // ***************************************************************
    // FIX: Perform a 2-step call to avoid the 400 error
    // ***************************************************************

    try {
      // STEP 1: Get grounded text data using Google Search
      setLoadingMessage('Developing strategy...');
      
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
      
      const searchPayload = {
        contents: [{ parts: [{ text: searchTextPrompt }] }],
        tools: [{ "google_search": {} }],
      };

      const searchData = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
      });

      const groundedText = searchData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!groundedText) {
        throw new Error('Step 1 Failed: No content returned from strategy generation.');
      }

      // STEP 2: Parse the grounded text into the required JSON schema
      setLoadingMessage('Formatting campaign...');

      const parseJsonPrompt = `
        Parse the following campaign strategy text and convert it into a valid JSON object matching the provided schema.

        TEXT TO PARSE:
        ---
        ${groundedText}
        ---

        Assign sequential IDs (1-6) to the 6 concepts.
      `;

      const jsonPayload = {
        contents: [{ parts: [{ text: parseJsonPrompt }] }],
        // NO 'tools' when 'generationConfig' is used for JSON
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: campaignSchema
        }
      };

      const jsonData = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonPayload),
      });

      const jsonText = jsonData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const parsedJson = JSON.parse(jsonText);
        setStrategyResult(parsedJson);
      } else {
        throw new Error('Step 2 Failed: No JSON content returned from parsing.');
      }

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
      Style: Modern, professional, engaging.
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
    // Scroll to the concept detail section
    const detailElement = document.getElementById('concept-detail');
    if (detailElement) {
      detailElement.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Illustrative data for strategy charts
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
      <h2 className="text-3xl font-bold text-gray-900">Campaign Forge</h2>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <StyledInput name="companyName" value={inputs.companyName} onChange={handleInputChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
          <StyledInput name="website" value={inputs.website} onChange={handleInputChange} placeholder="https://company.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Country</label>
          <StyledInput name="country" value={inputs.country} onChange={handleInputChange} placeholder="e.g., India" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target City</label>
          <StyledInput name="city" value={inputs.city} onChange={handleInputChange} placeholder="e.g., Mumbai" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Optional: Current Campaign Image URL</label>
          <StyledInput name="imageURL" value={inputs.imageURL} onChange={handleInputChange} placeholder="https://.../image.png" />
        </div>
        <div className="md:col-span-2">
          <StyledButton onClick={handleGenerateStrategy} disabled={isStrategyLoading} className="w-full">
            {isStrategyLoading ? <LoadingSpinner size={20} /> : 'Generate Strategy & Concepts'}
          </StyledButton>
        </div>
      </div>
      
      {isStrategyLoading && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size={48} />
          <p className="ml-4 text-xl text-gray-600">{loadingMessage || 'Forging your campaign...'}</p> {/* MODIFIED */}
        </div>
      )}

      {/* Strategy Output */}
      {strategyResult && (
        <div className="space-y-8">
          
          {/* Strategy & KPIs */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Your AI-Generated Campaign Strategy
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Campaign Strategy</h4>
                <p className="text-gray-700">{strategyResult.strategy}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Rationale</h4>
                <p className="text-gray-700">{strategyResult.rationale}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Conservative KPI Estimations</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {strategyResult.kpis.map(kpi => (
                    <li key={kpi.metric}><strong>{kpi.metric}:</strong> {kpi.value}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Framework & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 space-y-4">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Strategic Framework
              </h3>
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Core Message</h4>
                <p className="text-gray-700">{strategyResult.framework.coreMessage}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Channel Strategy</h4>
                <p className="text-gray-700">{strategyResult.framework.channelStrategy}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Content Calendar</h4>
                <p className="text-gray-700">{strategyResult.framework.contentCalendar}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-indigo-600">Risk Mitigation</h4>
                <p className="text-gray-700">{strategyResult.framework.riskMitigation}</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <ChartContainer title="Channel Performance (Illustrative)">
                <BarChart data={strategyChartData.channel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4F46E5" />
                </BarChart>
              </ChartContainer>
              
              <ChartContainer title="Audience Segmentation (Illustrative)">
                <PieChart>
                  <Pie data={strategyChartData.audience} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                    {strategyChartData.audience.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#4F46E5', '#A5B4FC', '#C7D2FE'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartContainer>
            </div>
          </div>
          
          {/* Campaign Concepts */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">
              6 AI-Generated Campaign Concepts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategyResult.concepts.map(concept => (
                <button
                  key={concept.id}
                  onClick={() => handleConceptClick(concept)}
                  className={`p-6 bg-indigo-50 rounded-lg border-2 text-left transition-all
                    ${selectedConcept?.id === concept.id ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-indigo-100 hover:border-indigo-300'}`}
                >
                  <h4 className="text-lg font-bold text-indigo-800">{concept.title}</h4>
                  <p className="text-sm text-gray-700 mt-2">{concept.summary}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Selected Concept Detail & Image Gen */}
          {selectedConcept && (
            <div id="concept-detail" className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Concept Detail: <span className="text-indigo-600">{selectedConcept.title}</span>
              </h3>
              <p className="text-gray-700 mb-4">{selectedConcept.summary}</p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-semibold text-gray-800">Visual Idea:</p>
                <p className="text-gray-700 italic">"{selectedConcept.visualIdea}"</p>
              </div>
              
              <StyledButton onClick={handleGenerateImages} disabled={isImageLoading} className="mt-6">
                {isImageLoading ? <LoadingSpinner size={20} /> : 'Generate Campaign Images (2)'}
              </StyledButton>
              
              {isImageLoading && (
                <div className="flex justify-center items-center p-12">
                  <LoadingSpinner size={48} />
                  <p className="ml-4 text-xl text-gray-600">Generating images...</p>
                </div>
              )}
              
              {generatedImages.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">Generated Images</h4>
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

// --- Tab 4: Pricing ---
const PricingCard = ({ plan, price, features, isFeatured = false }) => (
  <div className={`p-8 rounded-2xl border ${isFeatured ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xl' : 'bg-white text-gray-900 border-gray-200 shadow-lg'}`}>
    <h3 className="text-2xl font-semibold">{plan}</h3>
    <p className={`mt-2 text-4xl font-bold ${isFeatured ? 'text-white' : 'text-gray-900'}`}>
      {price}
      {price.startsWith('$') && <span className={`text-sm font-medium ${isFeatured ? 'text-indigo-100' : 'text-gray-500'}`}>/mo</span>}
    </p>
    <ul className={`mt-6 space-y-3 ${isFeatured ? 'text-indigo-50' : 'text-gray-600'}`}>
      {features.map((feature, index) => (
        <li key={index} className="flex items-center space-x-3">
          <Check size={20} className={isFeatured ? 'text-white' : 'text-indigo-600'} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <StyledButton
      className="w-full mt-8"
      variant={isFeatured ? 'secondary' : 'primary'}
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
      <h2 className="text-3xl font-bold text-gray-900 text-center">
        Simple, Transparent Pricing
      </h2>
      <p className="text-xl text-gray-600 text-center max-w-2xl mx-auto">
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

// --- Tab 5: About Us ---
const AboutUsTab = () => {
  return (
    <div className="max-w-3xl mx-auto bg-white p-10 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        About Us
      </h2>
      <div className="text-center mb-8">
        <img
          src="https://placehold.co/128x128/EFEBFF/4F46E5?text=YK"
          alt="Yash Kapadia"
          className="w-32 h-32 rounded-full mx-auto shadow-md border-4 border-white"
        />
        <h3 className="text-2xl font-semibold text-gray-800 mt-4">Yash Kapadia</h3>
        <p className="text-indigo-600 font-medium">IIM Ahmedabad</p>
      </div>
      <p className="text-gray-700 leading-relaxed text-lg text-center">
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
    { id: 'analyzer', label: 'Market Analyzer', icon: Target },
    { id: 'forge', label: 'Campaign Forge', icon: WandSparkles },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'about', label: 'About Us', icon: Info },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Bot size={32} className="text-indigo-600" />
            <span className="ml-3 text-2xl font-bold text-gray-900">Naya Daur</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex md:space-x-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <tab.icon size={18} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Mobile Nav (Placeholder) */}
          <div className="md:hidden">
            <span className="text-gray-500">Menu</span>
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
    // On load, check if API key is set. If not, show modal.
    // In a real app, this would check localStorage.
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, [apiKey]);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    setShowApiKeyModal(false);
    if (activeTab === 'welcome') {
      setActiveTab('analyzer'); // Move to first real tab
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
    <div className="min-h-screen bg-gray-50 font-sans">
      <AppHeader activeTab={activeTab} onTabClick={setActiveTab} />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {renderTabContent()}
      </main>

      <Modal isOpen={showApiKeyModal && activeTab !== 'welcome'} onClose={() => {}}>
        <WelcomeTab onApiKeySave={handleSaveApiKey} />
      </Modal>

      <ErrorToast message={error} onClose={() => setError(null)} />
    </div>
  );
}