"use client";

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
  ReferenceLine
} from 'recharts';
import { cn } from "@/lib/utils";

interface DataPoint {
  [key: string]: any;
}

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
  negativeColor?: string;
}

interface BarChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
  xAxisKey?: string;
  series: SeriesConfig[];
  tooltipFormat?: (value: number) => string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showReferenceLine?: boolean;
}

export function BarChart({
  data,
  className,
  height = 300,
  xAxisKey = 'month',
  series,
  tooltipFormat,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  showLegend = false,
  showReferenceLine = false
}: BarChartProps) {
  // Adapt to use 'name' as key if data has that instead of 'month'
  const hasName = data.length > 0 && data[0].name !== undefined;
  const actualXAxisKey = hasName ? 'name' : xAxisKey;
  
  // If data uses 'name' instead of 'month', transform it
  const formattedData = hasName 
    ? data.map(item => {
        const newItem = { ...item };
        newItem[actualXAxisKey] = item.name;
        return newItem;
      })
    : data;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={`tooltip-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-foreground/70">{entry.name}:</span>
              <span className="font-medium">
                {tooltipFormat ? tooltipFormat(entry.value as number) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={formattedData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 5,
          }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.2} />}
          {showXAxis && <XAxis 
            dataKey={actualXAxisKey} 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />}
          {showYAxis && <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={tooltipFormat}
            width={50}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />}
          {showReferenceLine && <ReferenceLine y={0} stroke="hsl(var(--border))" />}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend 
              iconType="circle" 
              iconSize={8} 
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-sm text-foreground/80">{value}</span>
              )}
            />
          )}
          {series.map((s, index) => (
            <React.Fragment key={`bar-fragment-${s.key}`}>
              {/* Positive values */}
              <Bar
                dataKey={(item) => (item[s.key] >= 0 ? item[s.key] : 0)}
                name={`${s.label} (Gain)`}
                fill={s.color}
                stackId={`stack-${index}`}
                radius={[4, 4, 0, 0]}
              />
              
              {/* Negative values */}
              {s.negativeColor && (
                <Bar
                  dataKey={(item) => (item[s.key] < 0 ? Math.abs(item[s.key]) : 0)}
                  name={`${s.label} (Loss)`}
                  fill={s.negativeColor}
                  stackId={`stack-${index}`}
                  radius={[0, 0, 4, 4]}
                />
              )}
            </React.Fragment>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
} 