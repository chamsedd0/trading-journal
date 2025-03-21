"use client";

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { cn } from "@/lib/utils";

// Accept both data formats for compatibility
type DataItem = {
  label?: string;
  date?: string;
  value: number;
};

interface LineChartProps {
  data: DataItem[];
  className?: string;
  height?: number;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  tooltipFormat?: (value: number) => string;
  lineColor?: string;
  baseValue?: number;
  showArea?: boolean;
  positiveAreaColor?: string;
  negativeAreaColor?: string;
  strokeWidth?: number;
}

export function LineChart({
  data,
  className,
  height = 300,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  tooltipFormat,
  lineColor = "hsl(var(--primary))",
  baseValue = 0,
  showArea = false,
  positiveAreaColor = "hsla(var(--success), 0.2)",
  negativeAreaColor = "hsla(var(--destructive), 0.2)",
  strokeWidth = 2
}: LineChartProps) {
  // Convert data if needed (ensure it has a label property)
  const formattedData = data.map(item => ({
    label: item.label || item.date || '',
    value: item.value
  }));

  // Determine if the trend is up or down
  const isTrendingUp = formattedData.length >= 2 && 
    formattedData[formattedData.length - 1].value >= formattedData[0].value;
  
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
              <span className="text-foreground/70">Value:</span>
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
    <div className={cn("w-full overflow-hidden", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {showArea ? (
          <AreaChart
            data={formattedData}
            margin={{
              top: 10,
              right: 10,
              left: 10,
              bottom: 20,
            }}
            style={{ backgroundColor: 'transparent' }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.2} />}
            {showXAxis && <XAxis 
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              height={20}
            />}
            {showYAxis && <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={value => tooltipFormat ? tooltipFormat(value) : value}
              width={80}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={['auto', 'auto']}
            />}
            <ReferenceLine 
              y={baseValue} 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1.5}
              label={{ 
                value: 'Initial Balance', 
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10
              }} 
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              fill={isTrendingUp ? positiveAreaColor : negativeAreaColor}
              strokeWidth={strokeWidth}
              dot={false}
              activeDot={{ r: 6, fill: lineColor }}
              fillOpacity={0.2}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <RechartsLineChart
            data={formattedData}
            margin={{
              top: 10,
              right: 10,
              left: 10,
              bottom: 20,
            }}
            style={{ backgroundColor: 'transparent' }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.2} />}
            {showXAxis && <XAxis 
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              height={20}
            />}
            {showYAxis && <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={value => tooltipFormat ? tooltipFormat(value) : value}
              width={80}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={['auto', 'auto']}
            />}
            <ReferenceLine 
              y={baseValue} 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1.5}
              label={{ 
                value: 'Initial Balance', 
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10
              }} 
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={strokeWidth}
              dot={false}
              activeDot={{ r: 6, fill: lineColor }}
            />
          </RechartsLineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
} 