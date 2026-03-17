import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function CandleChart({ klines = [], markers = [] }) {
  const ref = useRef();

  useEffect(() => {
    const chart = createChart(ref.current, {
      height: 380,
      layout: { background: { color: '#0d1117' }, textColor: '#d0d7de' },
      grid: { vertLines: { color: '#202938' }, horzLines: { color: '#202938' } }
    });

    const series = chart.addCandlestickSeries({
      upColor: '#24b47e', downColor: '#f85149', borderVisible: false, wickUpColor: '#24b47e', wickDownColor: '#f85149'
    });

    series.setData(klines.map((k) => ({
      time: Math.floor(k.open_time / 1000),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close
    })));
    series.setMarkers(markers);

    const resize = () => chart.applyOptions({ width: ref.current.clientWidth });
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
    };
  }, [klines, markers]);

  return <div ref={ref} className="chart" />;
}
