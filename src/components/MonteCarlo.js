import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import Svg, { Polyline, Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { COLORS } from '../../shared/colors';
import { runMonteCarloAsync } from '../../services/simulations/monteCarlo';
import { runBridgewaterAnalysis } from '../../shared/bridgewaterAnalysis';
import { runWhenIdle, cancelIdle } from '../utils/idleScheduler';
import { holdingsSignature } from '../../shared/helpers';

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_WIDTH = Dimensions.get('window').width - 32;
const H = 260;
const PAD = { l: 52, r: 16, t: 12, b: 32 };
const CW = CARD_WIDTH - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;
const SAMPLE = 60;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const percentileValue = (sorted, p) => {
  const idx = Math.max(0, Math.min(sorted.length - 1,
    Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

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

const fmt = (v) => {
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M';
  if (v >= 1000) return '$' + Math.round(v).toLocaleString();
  return '$' + Math.round(v);
};

const fmtTick = (v) => {
  if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
  if (Math.abs(v) >= 10000) return '$' + Math.round(v / 1000) + 'k';
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
  return '$' + Math.round(v);
};

const fmtPct = (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
const gainPct = (v, base) => base > 0 ? ((v - base) / base) * 100 : 0;

// ─── Sub-components ───────────────────────────────────────────────────────────

// Pill-style toggle button
const ToggleChip = ({ label, active, onPress, color }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      chipStyles.chip,
      active && { backgroundColor: color || '#1a1a1a', borderColor: color || '#1a1a1a' },
    ]}
    activeOpacity={0.7}
  >
    <Text style={[chipStyles.label, active && chipStyles.labelActive]}>{label}</Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  label: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  labelActive: { color: '#FFFFFF' },
});

// Scenario outcome card
const ScenarioCard = ({ label, value, pct, accentColor, isMiddle }) => (
  <View style={[scenarioStyles.card, isMiddle && scenarioStyles.middle]}>
    <View style={[scenarioStyles.dot, { backgroundColor: accentColor }]} />
    <Text style={scenarioStyles.label}>{label}</Text>
    <Text style={[scenarioStyles.value, { color: accentColor }]}>{value}</Text>
    <Text style={[scenarioStyles.pct, { color: pct >= 0 ? '#10B981' : '#EF4444' }]}>
      {fmtPct(pct)}
    </Text>
  </View>
);

const scenarioStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  middle: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  pct: {
    fontSize: 11,
    fontWeight: '500',
  },
});

// Stat row item
const StatItem = ({ label, value, valueColor }) => (
  <View style={statStyles.item}>
    <Text style={statStyles.label}>{label}</Text>
    <Text style={[statStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center' },
  label: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  value: { fontSize: 13, fontWeight: '700', color: '#111827' },
});

/**
 * Annualised drift estimate for one holding.
 *
 * The gain since purchase is a *cumulative* return. Feeding it to the simulator
 * as an annual mean overstates drift for anything held longer than a year (a
 * position up 60% over five years is ~10%/yr, not 60%/yr), so it is annualised
 * over the holding period when a purchase date is available.
 */
const annualisedDrift = (value, costTotal, purchaseDate) => {
  if (!(costTotal > 0)) return 8; // no cost basis — fall back to a market-ish default

  const totalReturn = (value - costTotal) / costTotal;
  if (1 + totalReturn <= 0) return -40;

  let years = 1;
  const parsed = purchaseDate ? new Date(purchaseDate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    const elapsed = (Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    // Under a quarter of a year, annualising amplifies noise into absurd drift.
    years = Math.max(0.25, elapsed);
  }

  const annual = (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
  return Math.max(-40, Math.min(40, annual));
};

const runStyles = StyleSheet.create({
  button: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: { color: COLORS.textWhite, fontSize: 15, fontWeight: '600' },
});

// ─── Main component ───────────────────────────────────────────────────────────
const MonteCarlo = ({ holdings = [], portfolioValue = 0, horizonYears = 1, autoRun = false }) => {
  const [runKey, setRunKey] = useState(0);
  const [bwResults, setBwResults] = useState(null);
  const [correlated, setCorrelated] = useState(true);
  const [Npaths, setNpaths] = useState(1000);
  const [dist, setDist] = useState('normal');
  const [studentDf] = useState(5);
  const [shrinkageAlpha] = useState(0.1);
  const [horizon, setHorizon] = useState(horizonYears);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  // A full run is seconds of solid CPU on a phone. It starts only when the user
  // asks for it, and re-runs automatically afterwards as they change controls.
  const [hasRun, setHasRun] = useState(autoRun);

  // Both effects below do expensive work (network history downloads, then a
  // 1000-path simulation). Key them on the positions so a price refresh, which
  // hands back a brand new holdings array, does not re-run everything.
  const positionsKey = useMemo(() => holdingsSignature(holdings), [holdings]);
  const holdingsRef = useRef(holdings);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);

  // ── Bridgewater analysis ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    if (!holdings || holdings.length < 2) { setBwResults(null); return undefined; }
    // Run Bridgewater analysis when idle to avoid blocking UI on mount/tab switch
    const job = runWhenIdle(async () => {
      try {
        const res = await runBridgewaterAnalysis(holdingsRef.current, { lookbackDays: 252 });
        if (mounted && res?.success) setBwResults(res);
      } catch (e) {
        if (mounted) setBwResults(null);
      }
    });
    return () => {
      mounted = false;
      cancelIdle(job);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey]);

  // ── Simulation ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    if (!hasRun) return undefined;
    if (!holdings.length || portfolioValue <= 0) { setResults(null); setLoading(false); return undefined; }

    const assets = holdings.map((h, i) => {
      const quantity = Number(h.quantity) || 0;
      const currentPrice = Number(h.currentPrice ?? h.currentUnitPrice ?? h.price) || 0;
      const value = quantity * currentPrice;
      const cost = Number(h.costBasis ?? h.purchasePrice ?? h.purchaseUnitPrice) || 0;
      const costTotal = quantity * (cost || 0);
      const muAnnual = annualisedDrift(value, costTotal, h.purchaseDate);
      const sigmaAnnual = bwResults?.assets?.[i]
        ? bwResults.assets[i].annualVolatility * 100
        : 25;
      return { S0: currentPrice, quantity, muAnnual, sigmaAnnual };
    });

    const covDaily = bwResults?.covarianceMatrix ?? null;
    setLoading(true);
    setProgress(0);
    const token = { cancelled: false };

    // Defer Monte Carlo runs to idle time to keep navigation & UI responsive
    const job = runWhenIdle(async () => {
      try {
        const sim = await runMonteCarloAsync(
          {
            assets,
            N: Npaths,
            steps: Math.round(252 * horizon),
            horizonYears: horizon,
            correlated,
            covDaily,
            sampleCount: SAMPLE,
            dist,
            studentDf,
            shrinkageAlpha,
          },
          {
            token,
            onProgress: (value) => {
              if (mounted && !token.cancelled) setProgress(value);
            },
          }
        );
        if (!mounted || token.cancelled) return;
        setResults(sim);
        setLoading(false);
      } catch (err) {
        if (!mounted || token.cancelled) return;
        setResults(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      token.cancelled = true;
      cancelIdle(job);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRun, positionsKey, horizon, runKey, bwResults, correlated, Npaths, dist]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!results && loading) {
    return (
      <View style={styles.container}>
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.content}>
            <View style={styles.loadingRow}>
              <View>
                <Text style={styles.title}>Simulation</Text>
                <Text style={styles.subtitle}>
                  Running {Npaths.toLocaleString()} paths… {Math.round(progress * 100)}%
                </Text>
              </View>
              <ActivityIndicator animating size={20} color="#111827" />
            </View>
            <View style={styles.loadingChart} />
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!results) {
    if (!holdings.length || portfolioValue <= 0) return null;

    return (
      <View style={styles.container}>
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.content}>
            <Text style={styles.title}>Projection</Text>
            <Text style={styles.subtitle}>
              Simulate {Npaths.toLocaleString()} possible paths for this portfolio over {horizon}
              {horizon === 1 ? ' year' : ' years'}.
            </Text>
            <TouchableOpacity
              style={runStyles.button}
              onPress={() => setHasRun(true)}
              activeOpacity={0.8}
            >
              <Text style={runStyles.buttonLabel}>Run projection</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const { samplePaths, pathP10, pathP50, pathP90, p10, p50, p90, probLoss, avgMaxDd, steps, cvar95 } = results;

  // ── Chart scale ───────────────────────────────────────────────────────────
  const allFlat = [...(pathP10 || []), ...(pathP50 || []), ...(pathP90 || [])];
  samplePaths?.forEach(s => s && allFlat.push(...s));
  const finiteVals = allFlat.filter(Number.isFinite);
  let minV = Math.min(...finiteVals);
  let maxV = Math.max(...finiteVals);
  const vPad = (maxV - minV) * 0.08;
  minV -= vPad; maxV += vPad;
  if (!(maxV > minV)) maxV = minV + 1;

  const mx = i => PAD.l + (i / steps) * CW;
  const my = v => H - PAD.b - ((v - minV) / (maxV - minV)) * CH;

  const sanitize = (series) => {
    if (!series?.length) return null;
    const out = [];
    let last = portfolioValue;
    for (const v of series) {
      if (Number.isFinite(v)) { out.push(v); last = v; }
      else out.push(last);
    }
    return out;
  };

  const pts = (series) => {
    const s = sanitize(series);
    if (!s) return null;
    return s.map((v, i) => `${mx(i).toFixed(1)},${my(v).toFixed(1)}`).join(' ');
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => minV + (maxV - minV) * t);
  const xTicks = Array.from({ length: horizon + 1 }, (_, i) => i);

  // Reference line (starting portfolio value)
  const refY = my(portfolioValue);
  const showRef = refY > PAD.t && refY < H - PAD.b;

  // Colors
  const lossColor = probLoss > 40 ? '#EF4444' : probLoss > 20 ? '#F59E0B' : '#10B981';
  const ddColor = avgMaxDd > 20 ? '#EF4444' : avgMaxDd > 10 ? '#F59E0B' : '#10B981';

  // Band polygon
  const bandPolygon = (() => {
    const up = sanitize(pathP90) || [];
    const dn = (sanitize(pathP10) || []).slice().reverse();
    if (!up.length || up.length !== dn.length) return null;
    return up.map((v, i) => `${mx(i)},${my(v)}`).concat(
      dn.map((v, i) => `${mx(up.length - 1 - i)},${my(v)}`)
    ).join(' ');
  })();

  return (
    <View style={styles.container}>
      <Card style={styles.card} elevation={0}>
        <Card.Content style={styles.content}>

          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Monte Carlo</Text>
              <Text style={styles.subtitle}>
                {Npaths.toLocaleString()} paths · {horizon}yr · {dist === 'student' ? 'Fat-tail' : 'Normal'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.rerunBtn}
              onPress={() => setRunKey(k => k + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.rerunLabel}>↺  Re-run</Text>
            </TouchableOpacity>
          </View>

          {/* ── Controls row ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.controlsScroll}
          >
            {/* Horizon */}
            <View style={styles.controlGroup}>
              <Text style={styles.controlGroupLabel}>Horizon</Text>
              <View style={styles.chipRow}>
                {[1, 3, 5, 10].map(y => (
                  <ToggleChip key={y} label={`${y}yr`} active={horizon === y} onPress={() => setHorizon(y)} />
                ))}
              </View>
            </View>

            <View style={styles.controlDivider} />

            {/* Paths */}
            <View style={styles.controlGroup}>
              <Text style={styles.controlGroupLabel}>Paths</Text>
              <View style={styles.chipRow}>
                {[100, 1000, 5000].map(v => (
                  <ToggleChip key={v} label={v >= 1000 ? `${v / 1000}k` : `${v}`} active={Npaths === v} onPress={() => setNpaths(v)} />
                ))}
              </View>
            </View>

            <View style={styles.controlDivider} />

            {/* Distribution */}
            <View style={styles.controlGroup}>
              <Text style={styles.controlGroupLabel}>Distribution</Text>
              <View style={styles.chipRow}>
                <ToggleChip label="Normal" active={dist === 'normal'} onPress={() => setDist('normal')} />
                <ToggleChip label="Fat-tail" active={dist === 'student'} onPress={() => setDist('student')} color="#7C3AED" />
              </View>
            </View>

            <View style={styles.controlDivider} />

            {/* Correlation */}
            <View style={styles.controlGroup}>
              <Text style={styles.controlGroupLabel}>Correlation</Text>
              <View style={styles.chipRow}>
                <ToggleChip label="On" active={correlated} onPress={() => setCorrelated(true)} />
                <ToggleChip label="Off" active={!correlated} onPress={() => setCorrelated(false)} />
              </View>
            </View>
          </ScrollView>

          {/* ── Chart ── */}
          <View style={styles.chartWrapper}>
            <Svg width={CARD_WIDTH} height={H}>
              {/* Y gridlines + labels */}
              {yTicks.map((v, i) => (
                <React.Fragment key={i}>
                  <Line
                    x1={PAD.l} y1={my(v)} x2={CARD_WIDTH - PAD.r} y2={my(v)}
                    stroke="#F3F4F6" strokeWidth={1}
                    strokeDasharray={i > 0 && i < 4 ? '3,4' : undefined}
                  />
                  <SvgText
                    x={PAD.l - 6} y={my(v) + 4}
                    textAnchor="end" fontSize={9} fill="#9CA3AF" fontFamily="System"
                  >
                    {fmtTick(v)}
                  </SvgText>
                </React.Fragment>
              ))}

              {/* Reference line (starting value) */}
              {showRef && (
                <Line
                  x1={PAD.l} y1={refY} x2={CARD_WIDTH - PAD.r} y2={refY}
                  stroke="#6B7280" strokeWidth={1} strokeDasharray="4,4"
                />
              )}

              {/* X labels */}
              {xTicks.map(i => (
                <SvgText
                  key={i}
                  x={mx(Math.round((i / horizon) * steps))}
                  y={H - PAD.b + 16}
                  textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="System"
                >
                  {i === 0 ? 'Now' : `${i}yr`}
                </SvgText>
              ))}

              {/* Ghost paths */}
              {samplePaths?.filter(Boolean).map((s, i) => {
                const p = pts(s);
                if (!p) return null;
                return (
                  <Polyline
                    key={i} points={p} fill="none"
                    stroke="#94A3B8" strokeWidth={0.6} strokeOpacity={0.18}
                  />
                );
              })}

              {/* Confidence band P10–P90 */}
              {bandPolygon && (
                <Polygon points={bandPolygon} fill="#94A3B8" fillOpacity={0.10} stroke="none" />
              )}

              {/* Percentile paths */}
              <Polyline points={pts(pathP10)} fill="none" stroke="#EF4444" strokeWidth={1.8} strokeOpacity={0.9} />
              <Polyline points={pts(pathP50)} fill="none" stroke="#111827" strokeWidth={2.2} />
              <Polyline points={pts(pathP90)} fill="none" stroke="#10B981" strokeWidth={1.8} strokeOpacity={0.9} />

              {/* End-point dots */}
              {[
                { path: pathP10, color: '#EF4444' },
                { path: pathP50, color: '#111827' },
                { path: pathP90, color: '#10B981' },
              ].map(({ path, color }, i) => {
                const s = sanitize(path);
                if (!s?.length) return null;
                const lastV = s[s.length - 1];
                return (
                  <Circle
                    key={i}
                    cx={mx(steps - 1)} cy={my(lastV)}
                    r={3.5} fill={color}
                  />
                );
              })}

              {/* Axes */}
              <Line x1={PAD.l} y1={H - PAD.b} x2={CARD_WIDTH - PAD.r} y2={H - PAD.b} stroke="#E5E7EB" strokeWidth={1} />
              <Line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#E5E7EB" strokeWidth={1} />
            </Svg>

            {/* Legend overlay */}
            <View style={styles.legendOverlay}>
              {[
                { label: 'Bear (P10)', color: '#EF4444' },
                { label: 'Base (P50)', color: '#111827' },
                { label: 'Bull (P90)', color: '#10B981' },
              ].map(({ label, color }) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Scenario outcomes ── */}
          <View style={styles.scenarioRow}>
            <ScenarioCard
              label="Bear"
              value={fmt(p10)}
              pct={gainPct(p10, portfolioValue)}
              accentColor="#EF4444"
            />
            <ScenarioCard
              label="Base"
              value={fmt(p50)}
              pct={gainPct(p50, portfolioValue)}
              accentColor="#111827"
              isMiddle
            />
            <ScenarioCard
              label="Bull"
              value={fmt(p90)}
              pct={gainPct(p90, portfolioValue)}
              accentColor="#10B981"
            />
          </View>

          {/* ── Risk stats bar ── */}
          <View style={styles.statsBar}>
            <StatItem
              label="Prob. Loss"
              value={probLoss.toFixed(1) + '%'}
              valueColor={lossColor}
            />
            <View style={styles.statDivider} />
            <StatItem
              label="Max Drawdown"
              value={avgMaxDd.toFixed(1) + '%'}
              valueColor={ddColor}
            />
            <View style={styles.statDivider} />
            <StatItem
              label="CVaR 95%"
              value={fmt(cvar95)}
              valueColor="#EF4444"
            />
          </View>

          {/* ── Disclaimer ── */}
          <Text style={styles.disclaimer}>
            GBM simulation · {dist === 'student' ? 'Student-t fat tails' : 'Normal distribution'} · Not financial advice
          </Text>

        </Card.Content>
      </Card>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '400',
  },
  rerunBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  rerunLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  // Controls
  controlsScroll: {
    paddingBottom: 14,
    alignItems: 'flex-start',
    gap: 0,
  },
  controlGroup: {
    marginRight: 4,
  },
  controlGroupLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 5,
  },
  controlDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
    marginTop: 16,
    height: 28,
    alignSelf: 'center',
  },

  // Chart
  chartWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  legendOverlay: {
    position: 'absolute',
    top: PAD.t + 4,
    right: PAD.r + 4,
    flexDirection: 'column',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '500',
  },

  // Scenarios
  scenarioRow: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    marginTop: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  loadingChart: {
    height: H,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 10,
    color: '#D1D5DB',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
});

export default MonteCarlo;