export const aggregateChartPython = async (table: string, group_by: string, sum_col: string) => {
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/aggregate_chart` : 'http://localhost:4028/api/aggregate_chart', {
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
    const res = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/predict_cashflow` : 'http://localhost:4028/api/predict_cashflow', {
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
    const res = await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/detect_anomaly` : 'http://localhost:4028/api/detect_anomaly', {
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
