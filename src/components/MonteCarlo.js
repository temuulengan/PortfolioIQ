import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../shared/colors';
import { calculateVolatility } from '../../shared/calculations';
import { runMonteCarlo } from '../../services/simulations/monteCarlo';
import { runBridgewaterAnalysis } from '../../shared/bridgewaterAnalysis';

const CARD_WIDTH = Dimensions.get('window').width - 32;
const H = 200;
const PAD = { l: 48, r: 12, t: 8, b: 28 };
const CW = CARD_WIDTH - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;
const N_PATHS = 1000;
const SAMPLE = 80;

const gaussian = () => {
  const u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const percentileValue = (sorted, p) => {
  const idx = Math.max(0, Math.min(sorted.length - 1,
    Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

// ✅ Find the actual path whose final value is closest to the percentile target
const percentilePath = (allPaths, allFinal, p) => {
  const sorted = [...allFinal].sort((a, b) => a - b);
  const target = percentileValue(sorted, p);
  let bestIdx = 0, bestDiff = Infinity;
  allFinal.forEach((v, i) => {
    const d = Math.abs(v - target);
    if (d < bestDiff) { bestDiff = d; bestIdx = i; }
  });
  return allPaths[bestIdx];
};

const calcMaxDrawdown = (series) => {
  let peak = -Infinity, maxDd = 0;
  for (let i = 0; i < series.length; i++) {
    if (series[i] > peak) peak = series[i];
    const dd = peak > 0 ? (peak - series[i]) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
};

const fmt = (v) => '$' + Math.round(v).toLocaleString();
const fmtPct = (v) => v.toFixed(1) + '%';
const fmtGain = (v, base) => {
  const pct = ((v - base) / base * 100).toFixed(1);
  return (pct >= 0 ? '+' : '') + pct + '%';
};

const MonteCarlo = ({ holdings = [], portfolioValue = 0, horizonYears = 1 }) => {
  const [runKey, setRunKey] = useState(0);
  const [bwResults, setBwResults] = useState(null);
  const [correlated, setCorrelated] = useState(true);
  const [weightSource, setWeightSource] = useState('current'); // 'current' or 'bridgewater'
  const [Npaths, setNpaths] = useState(1000);

  const results = useMemo(() => {
    if (!holdings.length || portfolioValue <= 0) return null;
    // assemble assets for the service
    const computed = holdings.map(h => {
      const quantity = Number(h.quantity) || 0;
      const currentPrice = Number(h.currentPrice ?? h.currentUnitPrice ?? h.price) || 0;
      const value = quantity * currentPrice;
      const cost = Number(h.costBasis ?? h.purchasePrice ?? h.purchaseUnitPrice) || 0;
      const costTotal = quantity * (cost || 0);
      const muAnnual = costTotal > 0 ? ((value - costTotal) / costTotal) * 100 : 0; // percent
      return { S0: currentPrice, quantity, muAnnual, // sigmaAnnual left undefined - will use Bridgewater when available
      };
    });

    // choose weights
    const weights = weightSource === 'bridgewater' && bwResults && bwResults.assets ?
      bwResults.assets.map(a => a.targetWeight ?? a.currentWeight) :
      computed.map(c => (c.quantity * c.S0));

    // try to build assets with sigmaAnnual from bridgewater if available
    const assets = computed.map((c, i) => ({
      ...c,
      sigmaAnnual: bwResults && bwResults.assets && bwResults.assets[i] ? (bwResults.assets[i].annualVolatility * 100) : undefined,
    }));

    // pass covDaily from bridgewater if available
    const covDaily = bwResults && bwResults.covarianceMatrix ? bwResults.covarianceMatrix : null;

    const sim = runMonteCarlo({ assets, N: Npaths, steps: Math.round(252 * horizonYears), correlated, covDaily, sampleCount: SAMPLE });
    return sim;
  }, [holdings, portfolioValue, horizonYears, runKey, bwResults, correlated, weightSource, Npaths]);

  // fetch Bridgewater analysis (async) to obtain covariance and per-asset vols
  React.useEffect(() => {
    let mounted = true;
    if (!holdings || holdings.length < 2) {
      setBwResults(null);
      return () => { mounted = false; };
    }

    (async () => {
      try {
        const res = await runBridgewaterAnalysis(holdings, { lookbackDays: 252 });
        if (mounted && res && res.success) {
          setBwResults(res);
        }
      } catch (err) {
        if (mounted) setBwResults(null);
      }
    })();

    return () => { mounted = false; };
  }, [holdings]);

  if (!results) return null;
  const { samplePaths, pathP10, pathP50, pathP90, p10, p50, p90, probLoss, avgMaxDd, steps } = results;

  // chart scale
  const allFlat = [...pathP10, ...pathP50, ...pathP90];
  samplePaths.forEach(s => allFlat.push(...s));
  let minV = allFlat[0], maxV = allFlat[0];
  for (let i = 1; i < allFlat.length; i++) {
    if (allFlat[i] < minV) minV = allFlat[i];
    if (allFlat[i] > maxV) maxV = allFlat[i];
  }
  const vPad = (maxV - minV) * 0.05;
  minV -= vPad; maxV += vPad;
  // Guard against degenerate range (all values equal) which yields division by zero
  if (!(maxV > minV)) {
    maxV = minV + 1;
  }

  const mx = i => PAD.l + (i / steps) * CW;
  const my = v => H - PAD.b - ((v - minV) / (maxV - minV)) * CH;
  const sanitizeSeries = (series) => {
    if (!series || !series.length) return null;
    const out = [];
    let last = portfolioValue;
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (Number.isFinite(v)) {
        out.push(v);
        last = v;
      } else {
        out.push(last);
      }
    }
    return out;
  };

  const pts = (series) => {
    const s = sanitizeSeries(series);
    if (!s) return null;
    return s.map((v, i) => `${mx(i).toFixed(1)},${my(v).toFixed(1)}`).join(' ');
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => minV + (maxV - minV) * t);
  const xTicks = Array.from({ length: horizonYears + 1 }, (_, i) => i);

  const lossColor = probLoss > 40 ? COLORS.error : probLoss > 20 ? COLORS.warning : COLORS.success;
  const ddColor = avgMaxDd > 20 ? COLORS.error : avgMaxDd > 10 ? COLORS.warning : COLORS.success;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Monte Carlo</Text>
              <Text style={styles.subtitle}>1,000 simulated paths · {horizonYears}yr horizon</Text>
            </View>
            <Button mode="outlined" compact onPress={() => setRunKey(k => k + 1)}
              style={styles.runBtn} labelStyle={styles.runBtnLabel}>
              Re-run
            </Button>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[['P90 optimistic','#1D9E75'],['P50 median',COLORS.textPrimary],['P10 pessimistic','#E24B4A']].map(([l,c]) => (
              <View key={l} style={styles.legItem}>
                <View style={[styles.legLine, { backgroundColor: c }]} />
                <Text style={styles.legText}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Chart */}
          <Svg width={CARD_WIDTH} height={H}>
            {/* y gridlines + labels */}
            {yTicks.map((v, i) => (
              <React.Fragment key={i}>
                <Line x1={PAD.l} y1={my(v)} x2={CARD_WIDTH - PAD.r} y2={my(v)}
                  stroke={COLORS.border} strokeWidth={0.5} />
                <SvgText x={PAD.l - 4} y={my(v) + 4}
                  textAnchor="end" fontSize={9} fill={COLORS.textSecondary}
                  fontFamily="System">
                  {'$' + Math.round(v / 1000) + 'k'}
                </SvgText>
              </React.Fragment>
            ))}
            {/* x labels */}
            {xTicks.map(i => (
              <SvgText key={i} x={mx(Math.round((i / horizonYears) * steps))}
                y={H - PAD.b + 14} textAnchor="middle" fontSize={9}
                fill={COLORS.textSecondary} fontFamily="System">
                {i === 0 ? 'Now' : `${i}yr`}
              </SvgText>
            ))}
            {/* ghost paths */}
            {samplePaths.filter(Boolean).map((s, i) => {
              const p = pts(s || []);
              if (!p) return null;
              return <Polyline key={i} points={p} fill="none"
                stroke="#888780" strokeWidth={0.5} strokeOpacity={0.1} />;
            })}
            {/* percentile paths */}
            <Polyline points={pts(pathP10)} fill="none" stroke="#E24B4A" strokeWidth={2} />
            <Polyline points={pts(pathP50)} fill="none" stroke={COLORS.textPrimary} strokeWidth={2} />
            <Polyline points={pts(pathP90)} fill="none" stroke="#1D9E75" strokeWidth={2} />
            {/* axes */}
            <Line x1={PAD.l} y1={H - PAD.b} x2={CARD_WIDTH - PAD.r} y2={H - PAD.b}
              stroke={COLORS.border} strokeWidth={1} />
            <Line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b}
              stroke={COLORS.border} strokeWidth={1} />
          </Svg>

          {/* P10 / P50 / P90 summary — matches AIInsights healthCard style */}
          <View style={styles.healthCard}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>P10</Text>
              <Text style={[styles.gridValue, { color: '#E24B4A' }]}>{fmt(p10)}</Text>
              <Text style={[styles.gridSub, { color: '#E24B4A' }]}>{fmtGain(p10, portfolioValue)}</Text>
            </View>
            <View style={[styles.gridItem, styles.gridMiddle]}>
              <Text style={styles.gridLabel}>P50</Text>
              <Text style={styles.gridValue}>{fmt(p50)}</Text>
              <Text style={[styles.gridSub, { color: p50 >= portfolioValue ? '#1D9E75' : '#E24B4A' }]}>
                {fmtGain(p50, portfolioValue)}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>P90</Text>
              <Text style={[styles.gridValue, { color: '#1D9E75' }]}>{fmt(p90)}</Text>
              <Text style={[styles.gridSub, { color: '#1D9E75' }]}>{fmtGain(p90, portfolioValue)}</Text>
            </View>
          </View>

          {/* Prob of loss + drawdown pills */}
          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricPillLabel}>Probability of loss</Text>
              <Text style={[styles.metricPillVal, { color: lossColor }]}>{fmtPct(probLoss)}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricPillLabel}>Avg max drawdown</Text>
              <Text style={[styles.metricPillVal, { color: ddColor }]}>{fmtPct(avgMaxDd)}</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Simulated paths use geometric Brownian motion. Not financial advice.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 16 },
  card: { borderRadius: 14, backgroundColor: '#FCFCFC' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  runBtn: { borderRadius: 18, borderColor: '#1F1F1F' },
  runBtnLabel: { fontSize: 12, color: COLORS.textPrimary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legLine: { width: 18, height: 2.5, borderRadius: 2 },
  legText: { fontSize: 11, color: COLORS.textSecondary },
  healthCard: {
    flexDirection: 'row', marginTop: 14,
    backgroundColor: '#F9FAFB', borderColor: '#1F1F1F',
    borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 10,
  },
  gridItem: { flex: 1, alignItems: 'center' },
  gridMiddle: {
    borderLeftWidth: 0.5, borderRightWidth: 0.5,
    borderColor: '#1F1F1F',
  },
  gridLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  gridValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  gridSub: { fontSize: 11, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metricPill: {
    flex: 1, backgroundColor: '#F7F7F7',
    borderColor: '#1F1F1F', borderWidth: 1,
    borderRadius: 16, padding: 10,
  },
  metricPillLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  metricPillVal: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: COLORS.textDisabled, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
});

export default MonteCarlo;