const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:5000';
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://tifa-ai-assistant.vercel.app';
};

export const aggregateChartPython = async (table: string, group_by: string, sum_col: string) => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/aggregate_chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, group_by, sum_col })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching python chart data:', error);
    return { error: error.message };
  }
};

export const predictCashflowPython = async (months_ahead: number) => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/predict_cashflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ months_ahead })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching python forecast:', error);
    return { error: error.message };
  }
};

export const detectAnomalyPython = async (table: string, amount_col: string) => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/detect_anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, amount_col })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching python anomalies:', error);
    return { error: error.message };
  }
};

export const askSqlPython = async (question: string) => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/ask_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching sql agent:', error);
    return { error: error.message };
  }
};

export const searchVectorPython = async (query: string, file_name?: string, top_k: number = 5) => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/search_document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, file_name, top_k })
    });
    return await res.json();
  } catch (error: any) {
    console.error('Error fetching vector search:', error);
    return { error: error.message };
  }
};
