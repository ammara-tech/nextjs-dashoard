import { formatCurrency, generateYAxis } from '@/app/lib/utils';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { fetchRevenue } from '@/app/lib/data';
import ChartHoverArea, { tip } from '@/app/ui/chart-hover';

// This component is representational only.
// For data visualization UI, check out:
// https://www.tremor.so/
// https://www.chartjs.org/
// https://airbnb.io/visx/

export default async function RevenueChart() {
  const revenue = await fetchRevenue();

  const chartHeight = 350;
  const { yAxisLabels, topLabel } = generateYAxis(revenue);
  const totalRevenue = revenue.reduce((sum, month) => sum + month.revenue, 0);
  const bestMonth = revenue.reduce((best, month) => (month.revenue > best.revenue ? month : best), revenue[0]);

  if (!revenue || revenue.length === 0) {
    return <p className="mt-4 text-gray-400">No data available.</p>;
  }

  return (
    <div className="w-full md:col-span-4">
      <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Recent Revenue
      </h2>
      <div className="rounded-xl bg-gray-50 p-4">
        <ChartHoverArea>
        <div className="sm:grid-cols-13 mt-0 grid grid-cols-12 items-end gap-2 rounded-md bg-white p-4 md:gap-4">
          {/* y-axis */}
          <div
            className="mb-6 hidden flex-col justify-between text-sm text-gray-400 sm:flex"
            style={{ height: `${chartHeight}px` }}
          >
            {yAxisLabels.map((label) => (
              <p key={label}>{label}</p>
            ))}
          </div>

          {revenue.map((month, index) => (
            <div
              key={month.month}
              className="group relative flex flex-col items-center gap-2"
            >
              <div
                role="img"
                aria-label={`${month.month}: ${formatCurrency(month.revenue)}`}
                tabIndex={0}
                className="relative w-full cursor-pointer rounded-md bg-blue-300 outline-none transition-colors hover:bg-blue-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                data-tip={tip({
                  title: month.month,
                  rows: [
                    { label: 'Revenue', value: formatCurrency(month.revenue), color: '#93c5fd' },
                    {
                      label: 'Change',
                      value:
                        index === 0
                          ? 'First month shown'
                          : `${month.revenue >= revenue[index - 1].revenue ? '+' : '-'}${formatCurrency(
                              Math.abs(month.revenue - revenue[index - 1].revenue),
                            )} vs ${revenue[index - 1].month}`,
                    },
                    {
                      label: 'Share of year',
                      value: `${totalRevenue === 0 ? 0 : Math.round((month.revenue / totalRevenue) * 100)}%`,
                    },
                  ],
                  footnote:
                    month.month === bestMonth.month
                      ? `Best month of the last 12 (total ${formatCurrency(totalRevenue)})`
                      : `Last 12 months total ${formatCurrency(totalRevenue)}`,
                })}
                style={{
                  height: `${(chartHeight / topLabel) * month.revenue}px`,
                }}
              />
              <p className="-rotate-90 text-sm text-gray-400 sm:rotate-0">
                {month.month}
              </p>
            </div>
          ))}
        </div>
        </ChartHoverArea>
        <div className="flex items-center pb-2 pt-6">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <h3 className="ml-2 text-sm text-gray-500 ">Last 12 months</h3>
        </div>
      </div>
    </div>
  );
}
