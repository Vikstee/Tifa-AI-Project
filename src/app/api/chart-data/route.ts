import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/chart-data
 * Zero-token endpoint: fetches and aggregates chart data directly from Supabase.
 * Used by ChartViewer for dynamic filtering and drill-down without consuming AI tokens.
 *
 * Body:
 * {
 *   sourceTable: string,       // e.g. "projects"
 *   groupByColumn: string,     // e.g. "status"
 *   sumColumn: string,         // e.g. "amount"
 *   filterColumn?: string,     // optional extra filter column e.g. "category"
 *   filterValue?: string,      // optional filter value e.g. "Vendor A"
 *   drillColumn?: string,      // when fetching rows for drill-down table
 *   drillValue?: string,       // the clicked label value
 *   limit?: number,            // default 50 for drill-down
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceTable,
      groupByColumn,
      sumColumn,
      filterColumn,
      filterValue,
      drillColumn,
      drillValue,
      limit = 50,
    } = body;

    if (!sourceTable) {
      return NextResponse.json({ error: 'sourceTable is required' }, { status: 400 });
    }

    const projectColumns = ['portfolio', 'segment', 'customer', 'project_name', 'lop_group_name', 'sid', 'io_number', 'funnel'];
    const isProjectCol = (col: string | undefined) => col ? projectColumns.includes(col) : false;

    // === FETCH DISTINCT VALUES MODE (For Filter Dropdowns) ===
    if (body.fetchDistinctColumn) {
      const col = body.fetchDistinctColumn;
      let queryStr = col;
      if (sourceTable !== 'projects' && isProjectCol(col)) {
        queryStr = `projects!inner(${col})`;
      }
      const { data, error } = await supabase.from(sourceTable).select(queryStr).limit(2000);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const distinct = Array.from(new Set(data.map((r: any) => {
        const val = r.projects ? r.projects[col] : r[col];
        return String(val ?? '');
      }).filter(Boolean))).sort();
      
      return NextResponse.json({ distinctValues: distinct });
    }

    // === DRILL-DOWN MODE: fetch raw rows for a specific clicked label ===
    if (drillColumn && drillValue) {
      let queryStr = '*';
      const joinProjects = sourceTable !== 'projects' && (isProjectCol(drillColumn) || isProjectCol(filterColumn));
      if (joinProjects) {
        queryStr = '*, projects!inner(*)';
      }

      let query = supabase.from(sourceTable).select(queryStr).limit(limit);
      
      if (isProjectCol(drillColumn) && sourceTable !== 'projects') {
        query = query.ilike(`projects.${drillColumn}`, `%${drillValue}%`);
      } else {
        query = query.ilike(drillColumn, `%${drillValue}%`);
      }

      if (filterColumn && filterValue) {
        if (isProjectCol(filterColumn) && sourceTable !== 'projects') {
          query = query.ilike(`projects.${filterColumn}`, `%${filterValue}%`);
        } else {
          query = query.ilike(filterColumn, `%${filterValue}%`);
        }
      }

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Flatten projects data into main row for table rendering
      const flattenedData = data.map((row: any) => {
        if (row.projects) {
          const { projects, ...rest } = row;
          return { ...projects, ...rest };
        }
        return row;
      });

      return NextResponse.json({ rows: flattenedData });
    }

    // === AGGREGATE MODE: group-by + sum for chart rendering ===
    if (!groupByColumn || !sumColumn) {
      return NextResponse.json({ error: 'groupByColumn and sumColumn are required for chart mode' }, { status: 400 });
    }

    let selectStr = `${groupByColumn}, ${sumColumn}`;
    const joinProjects = sourceTable !== 'projects' && (isProjectCol(groupByColumn) || isProjectCol(filterColumn));
    if (joinProjects) {
      selectStr = `projects!inner(${isProjectCol(groupByColumn) ? groupByColumn : ''}${isProjectCol(filterColumn) && filterColumn !== groupByColumn ? ',' + filterColumn : ''}), ${sumColumn}`;
    }

    let query = supabase.from(sourceTable).select(selectStr).limit(500);

    if (filterColumn && filterValue) {
      if (isProjectCol(filterColumn) && sourceTable !== 'projects') {
        query = query.ilike(`projects.${filterColumn}`, `%${filterValue}%`);
      } else {
        query = query.ilike(filterColumn, `%${filterValue}%`);
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data || data.length === 0) {
      return NextResponse.json({ chartData: [], uniqueValues: [] });
    }

    // Group & sum client-side (saves Supabase RPC complexity)
    const grouped: Record<string, number> = {};
    for (const row of data) {
      const groupVal = row.projects ? row.projects[groupByColumn] : row[groupByColumn];
      const key = String(groupVal ?? 'Lainnya');
      const val = Number(row[sumColumn]) || 0;
      grouped[key] = (grouped[key] || 0) + val;
    }

    // Sort descending by value, cap at 15, group rest as "Lainnya"
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 15);
    const rest = sorted.slice(15);
    if (rest.length > 0) {
      const restSum = rest.reduce((s, [, v]) => s + v, 0);
      top.push(['Lainnya', restSum]);
    }

    const chartData = top.map(([label, value]) => ({ label, value }));

    // Also return unique groupByColumn values for filter dropdown (from raw data)
    const uniqueValues: string[] = Array.from(new Set(data.map((r: any) => {
      const groupVal = r.projects ? r.projects[groupByColumn] : r[groupByColumn];
      return String(groupVal ?? '');
    }).filter(Boolean))).slice(0, 100);

    return NextResponse.json({ chartData, uniqueValues });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
