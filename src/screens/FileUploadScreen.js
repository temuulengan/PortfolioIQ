// File: src/screens/FileUploadScreen.js
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Card, TextInput, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import PortfolioFileUpload from '../components/PortfolioFileUpload';
import ReconciliationPanel from '../components/ReconciliationPanel';
import useFileUploadPipeline from '../hooks/useFileUploadPipeline';

import { runBridgewaterAnalysis } from '../../shared/bridgewaterAnalysis';
import { runMonteCarloAsync } from '../../services/simulations/monteCarlo';
import { addHolding } from '../../services/firebase/firebase';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';
import { COLORS } from '../../shared/colors';

const FileUploadScreen = () => {
  const navigation = useNavigation();
  const { file, selectFile, parse, parsedRows, parseErrors, reconcile, report, resolveAndRun, resolvedHoldings, loading } = useFileUploadPipeline();
  const { selectPortfolio, createNewPortfolio, loadPortfolios, loadHoldings } = useContext(PortfolioContext);
  const [overrides, setOverrides] = useState({});
  const [excluded, setExcluded] = useState([]);
  const [step, setStep] = useState(1); // 1=upload,2=review,3=complete
  const [loadingMessage, setLoadingMessage] = useState('');
  const [portfolioName, setPortfolioName] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const onFileSelected = (f) => selectFile(f);

  const doParse = async () => {
    setLoadingMessage('Parsing file...');
    try {
      await parse();
      setLoadingMessage('Reconciling holdings...');
      await reconcile();
      // advance to review step
      setPortfolioName((file && file.name) ? file.name.replace(/\.[^/.]+$/, '') : `Imported ${new Date().toISOString()}`);
      setStep(2);
    } catch (err) {
      console.error('Parse/Reconcile failed:', err);
    } finally {
      setLoadingMessage('');
    }
  };

  const handleResolveRow = (idx, symbol) => {
    setOverrides(prev => ({ ...prev, [idx]: symbol }));
  };

  const handleExcludeRow = (idx) => {
    // toggle exclude so user can undo
    setExcluded(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return Array.from(s);
    });
  };

  const handleRun = async () => {
    setLoadingMessage('Resolving holdings...');
    const final = await resolveAndRun(overrides, excluded);
    // Persist imported portfolio and holdings so it appears like other portfolios
    let createdPortfolio = null;
    try {
      const baseName = portfolioName || ((file && file.name) ? file.name.replace(/\.[^/.]+$/, '') : `Imported ${new Date().toISOString()}`);
      const portfolioData = { name: baseName, type: 'import', currency: 'USD' };
      const res = await createNewPortfolio(portfolioData);
      if (res && res.success) {
        createdPortfolio = res.portfolio;
        // add holdings
        await Promise.all(final.map(async (h) => {
          try {
            await addHolding(createdPortfolio.id, {
                symbol: h.symbol,
                quantity: h.quantity || 0,
                currentPrice: h.currentPrice || 0,
                purchasePrice: h.avgCost ?? h.purchasePrice ?? null,
                raw: h.raw || null,
                lastUpdated: new Date().toISOString(),
              });
          } catch (err) {
            console.error('Failed to add holding during import for', h.symbol, err.message || err);
          }
        }));

        // refresh portfolios and select the new portfolio so Dashboard/Portfolios reflect it
        try {
          await loadPortfolios();
        } catch (e) {
          // ignore load errors
        }
        // Ensure holdings are loaded from Firestore for the created portfolio before selecting
        try {
          await loadHoldings(createdPortfolio.id);
        } catch (e) {
          // if loadHoldings fails, fall back to selecting anyway
        }
        // wait for holdings to be loaded and then select
        try { await loadHoldings(createdPortfolio.id); } catch (e) {}
        selectPortfolio(createdPortfolio);
        // show success step
        setSuccessInfo({ portfolio: createdPortfolio, count: final.length });
        setStep(3);
      } else {
        console.error('createNewPortfolio failed:', res && res.error);
      }
    } catch (err) {
      console.error('Failed to persist imported portfolio:', err.message || err);
      // surface error to user
      setLoadingMessage('');
      return;
    }
    // map final holdings to runBridgewater and monteCarlo inputs (optional background tasks)
    const bwHoldings = final.map(h => ({ symbol: h.symbol, quantity: h.quantity || 0, currentPrice: h.currentPrice || 0 }));
    (async () => {
      try {
        await runBridgewaterAnalysis(bwHoldings, { lookbackDays: 252 });
      } catch (e) { console.error('Background Bridgewater analysis failed', e); }
    })();
    // monte carlo in background
    (async () => {
      try {
        const mcAssets = final.map(h => ({ S0: h.currentPrice || 0, quantity: h.quantity || 0, ticker: h.symbol }));
        await runMonteCarloAsync({ assets: mcAssets, N: 2000, steps: 252, sampleCount: 25 });
      } catch (e) { console.error('Background Monte Carlo failed', e); }
    })();
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, backgroundColor: COLORS.background }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Step {step} of 3</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 6, color: COLORS.textPrimary }}>{step === 1 ? 'Import Portfolio' : step === 2 ? 'Review Holdings' : 'Import Complete'}</Text>
        <Paragraph style={{ color: COLORS.textSecondary, marginTop: 4 }}>
          {step === 1 && 'Upload a CSV or XLSX file containing your holdings.'}
          {step === 2 && `${(parsedRows || []).length || 0} rows parsed. Review matched holdings and exclusions before importing.`}
          {step === 3 && successInfo ? `Imported ${successInfo.count} holdings into "${successInfo.portfolio.name}".` : ''}
        </Paragraph>
      </View>

      <Card style={{ padding: 12, marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }}>
        <PortfolioFileUpload onFileSelected={onFileSelected} />
        {file && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: COLORS.textPrimary }}>Selected file: {file.name}</Text>
          </View>
        )}
      </Card>

      {step === 1 && file && (
        <Card style={{ padding: 12, marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button mode="contained" onPress={doParse} disabled={loading || !!loadingMessage || !file} style={{ backgroundColor: COLORS.primary }} labelStyle={{ color: COLORS.textWhite }}>
              Continue to Review
            </Button>
          </View>
        </Card>
      )}

      {loadingMessage ? (
        <Card style={{ padding: 12, marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }}>
          <ActivityIndicator animating={true} color={COLORS.primary} />
          <Text style={{ marginTop: 8, color: COLORS.textPrimary }}>{loadingMessage}</Text>
        </Card>
      ) : null}

      {parseErrors && parseErrors.length ? (
        <Card style={{ padding: 12, marginBottom: 12, backgroundColor: COLORS.lossBg, borderColor: COLORS.border, borderWidth: 1 }}>
          <Text style={{ fontWeight: '700', color: COLORS.critical }}>Parse Errors</Text>
          {parseErrors.map((e, i) => (
            <Paragraph key={i} style={{ color: COLORS.critical }}>{e}</Paragraph>
          ))}
        </Card>
      ) : null}

      {report && step === 2 && (
        <View style={{ marginBottom: 12 }}>
          <ReconciliationPanel report={report} onResolveRow={handleResolveRow} onExcludeRow={handleExcludeRow} onRun={handleRun} initialHoldings={parsedRows} excluded={excluded} />

          <Card style={{ padding: 12, marginTop: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }}>
            <Text style={{ marginBottom: 8, color: COLORS.textPrimary }}>Portfolio name</Text>
            <TextInput value={portfolioName} onChangeText={setPortfolioName} mode="outlined" />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button mode="contained" onPress={handleRun} disabled={loading || !parsedRows || parsedRows.length === 0} style={{ backgroundColor: COLORS.primary }} labelStyle={{ color: COLORS.textWhite }}>Run Analysis & Import</Button>
            </View>
          </Card>
        </View>
      )}

      {step === 3 && successInfo && (
        <Card style={{ padding: 12, marginBottom: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>Import Complete</Text>
          <Paragraph style={{ marginTop: 8, color: COLORS.textSecondary }}>{`Saved portfolio "${successInfo.portfolio.name}" with ${successInfo.count} holdings.`}</Paragraph>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button onPress={() => navigation.navigate('Main', { screen: 'Portfolios' })} style={{ color: COLORS.primary }}>View Portfolios</Button>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({});

export default FileUploadScreen;
