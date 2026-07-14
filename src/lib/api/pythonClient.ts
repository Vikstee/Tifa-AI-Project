export const aggregateChartPython = async (table: string, group_by: string, sum_col: string) => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tifa-ai-assistant.vercel.app';
    const res = await fetch(`${baseUrl}/api/aggregate_chart`, {
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tifa-ai-assistant.vercel.app';
    const res = await fetch(`${baseUrl}/api/predict_cashflow`, {
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tifa-ai-assistant.vercel.app';
    const res = await fetch(`${baseUrl}/api/detect_anomaly`, {
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
