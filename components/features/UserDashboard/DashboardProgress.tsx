
import React, { useState, useEffect, useContext } from 'react';
import { ProgressDataPoint, ProgressMetric, BodyScanMetrics, Gender, ActivityLevel } from '../../../types';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Scale, Activity, Percent, PlusCircle, FileText, Trash2 } from 'lucide-react';
import { AuthContext, AuthContextType } from '../../../contexts/AuthContext';
import { analyzeBodyScanData } from '../../../services/geminiService';
import LoadingSpinner from '../../ui/LoadingSpinner';
import Modal from '../../ui/Modal';
import { loadFromLocalStorage, saveToLocalStorage } from '../../../localStorageUtils';
import { useToasts, ToastType } from '../../ui/Toast';
import PageWrapper from '../../layout/PageWrapper'; // Added import


const PROGRESS_METRICS_KEY = 'progress_metrics';
const BODY_SCANS_KEY = 'body_scans';

const initialMetricsSetup = (): ProgressMetric[] => [
  { name: 'Peso Corporal', unit: 'kg', data: [] },
  { name: 'Duração do Treino', unit: 'min', data: [] },
  { name: 'Flexões Máximas', unit: 'reps', data: [] },
];


const genderOptions: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
];

const activityLevelOptions: { value: ActivityLevel; label: string }[] = [
    { value: 'sedentary', label: 'Sedentário (pouco ou nenhum exercício)' },
    { value: 'light', label: 'Leve (exercício leve 1-3 dias/semana)' },
    { value: 'moderate', label: 'Moderado (exercício moderado 3-5 dias/semana)' },
    { value: 'active', label: 'Ativo (exercício intenso 6-7 dias/semana)' },
    { value: 'very_active', label: 'Muito Ativo (exercício muito intenso e trabalho físico)' },
];


const DashboardProgress: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const { addToast } = useToasts();
  const [metrics, setMetrics] = useState<ProgressMetric[]>(initialMetricsSetup());
  const [bodyScans, setBodyScans] = useState<BodyScanMetrics[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<ProgressMetric | null>(null);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logValue, setLogValue] = useState('');
  const [metricToLog, setMetricToLog] = useState<ProgressMetric | null>(null);

  const [isBodyScanModalOpen, setIsBodyScanModalOpen] = useState(false);
  const [bodyScanInput, setBodyScanInput] = useState<Partial<BodyScanMetrics>>({date: new Date().toISOString().split('T')[0]});
  const [bodyScanAnalysis, setBodyScanAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      const loadedMetrics = loadFromLocalStorage<ProgressMetric[]>(PROGRESS_METRICS_KEY, user.id);
      const loadedBodyScans = loadFromLocalStorage<BodyScanMetrics[]>(BODY_SCANS_KEY, user.id);

      setMetrics(loadedMetrics || initialMetricsSetup());
      setBodyScans(loadedBodyScans || []);
      setSelectedMetric( (loadedMetrics && loadedMetrics.length > 0) ? loadedMetrics[0] : (initialMetricsSetup())[0] );
    } else {
      // Reset to defaults if no user or user logs out
      setMetrics(initialMetricsSetup());
      setBodyScans([]);
      setSelectedMetric((initialMetricsSetup())[0]);
    }
    setIsLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (user && !isLoadingData) {
      saveToLocalStorage(PROGRESS_METRICS_KEY, metrics, user.id);
    }
  }, [metrics, user, isLoadingData]);

  useEffect(() => {
    if (user && !isLoadingData) {
      saveToLocalStorage(BODY_SCANS_KEY, bodyScans, user.id);
    }
  }, [bodyScans, user, isLoadingData]);


  const handleLogMetric = (metric: ProgressMetric) => {
    setMetricToLog(metric);
    setLogValue('');
    setLogDate(new Date().toISOString().split('T')[0]);
    setIsLogModalOpen(true);
  };

  const submitLog = () => {
    if (metricToLog && logValue && user) {
      const newValue = parseFloat(logValue);
      if (isNaN(newValue)) {
        addToast("Valor inválido.", ToastType.Error);
        return;
      }
      const newPoint: ProgressDataPoint = { date: logDate, value: newValue };
      const updatedMetrics = metrics.map(m => 
        m.name === metricToLog.name 
        ? { ...m, data: [...m.data, newPoint].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) } 
        : m
      );
      setMetrics(updatedMetrics);
      const newlyUpdatedMetric = updatedMetrics.find(m => m.name === metricToLog.name);
      if (newlyUpdatedMetric) setSelectedMetric(newlyUpdatedMetric);
      addToast(`Registro para "${metricToLog.name}" salvo!`, ToastType.Success);
      setIsLogModalOpen(false);
    } else if (!user) {
      addToast("Você precisa estar logado para registrar métricas.", ToastType.Error);
    }
  };

  const handleBodyScanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "age" || name === "weightKg" || name === "heightCm" || name === "bodyFatPercentage" || name === "muscleMassKg") {
      setBodyScanInput(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
      setBodyScanInput(prev => ({ ...prev, [name]: value as any }));
    }
  };

  const submitBodyScan = async () => {
    if (!user) {
      addToast("Você precisa estar logado para registrar body scans.", ToastType.Error);
      return;
    }
    if (!bodyScanInput.date) {
        addToast("A data do scan é obrigatória.", ToastType.Warning);
        return;
    }
    
    const newScan: BodyScanMetrics = {
        date: bodyScanInput.date,
        weightKg: bodyScanInput.weightKg,
        heightCm: bodyScanInput.heightCm,
        bodyFatPercentage: bodyScanInput.bodyFatPercentage,
        muscleMassKg: bodyScanInput.muscleMassKg,
        age: bodyScanInput.age || user.age, // User.age needs to be part of UserType
        gender: bodyScanInput.gender || user.gender, // User.gender needs to be part of UserType
        activityLevel: bodyScanInput.activityLevel,
    };
    setBodyScans(prev => [...prev, newScan].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    
    setIsAnalyzing(true);
    setBodyScanAnalysis(null);
    const analysis = await analyzeBodyScanData({
        weightKg: newScan.weightKg, 
        heightCm: newScan.heightCm, 
        age: newScan.age,
        gender: newScan.gender,
        activityLevel: newScan.activityLevel
    });
    setBodyScanAnalysis(analysis);
    setIsAnalyzing(false);
    addToast("Body Scan salvo e analisado pela IA!", ToastType.Success);
    // Keep modal open to show analysis, or close if preferred:
    // setIsBodyScanModalOpen(false); 
  };
  
  const handleDeleteBodyScan = (scanDate: string) => {
    setBodyScans(prev => prev.filter(scan => scan.date !== scanDate));
    addToast("Registro de Body Scan removido.", ToastType.Info);
    if (bodyScans.length === 1) setBodyScanAnalysis(null); // Clear analysis if last scan removed
  };

  if (isLoadingData) {
    return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;
  }
   if (!user && !isLoadingData) {
        return (
             <PageWrapper title="Progresso">
                <Card className="text-center p-8">
                    <TrendingUp size={48} className="mx-auto mb-4 text-primary"/>
                    <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-3">Acompanhe Sua Evolução</h3>
                    <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">Faça login para registrar e visualizar seu progresso ao longo do tempo.</p>
                </Card>
            </PageWrapper>
        );
    }


  return (
    <PageWrapper title="Seu Progresso">
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          {/* Title is now handled by PageWrapper */}
          <div className="flex space-x-2 ml-auto"> {/* Use ml-auto to push buttons to the right if no title is here */}
            <Button onClick={() => setIsBodyScanModalOpen(true)} leftIcon={FileText} variant="outline">Simular Body Scan</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {metrics.map(metric => (
            <Card 
              key={metric.name} 
              className={`cursor-pointer transition-all ${selectedMetric?.name === metric.name ? 'ring-2 ring-primary dark:ring-primary-light' : 'hover:shadow-md dark:hover:shadow-slate-700'}`}
              onClick={() => setSelectedMetric(metric)}
            >
              <h3 className="text-lg font-medium text-neutral-dark dark:text-white">{metric.name}</h3>
              <p className="text-2xl font-bold text-primary dark:text-primary-light">
                {metric.data.length > 0 ? metric.data[metric.data.length - 1].value : '-'} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{metric.unit}</span>
              </p>
              <Button size="sm" variant="ghost" className="mt-2 text-xs !p-1" onClick={(e) => { e.stopPropagation(); handleLogMetric(metric); }}>Registrar Novo</Button>
            </Card>
          ))}
        </div>
        
        {selectedMetric && selectedMetric.data.length > 0 ? (
            <Card>
            <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-1">{selectedMetric.name} ao Longo do Tempo</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Unidade: {selectedMetric.unit}</p>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedMetric.data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('pt-BR', {month:'short', day:'numeric'})} tick={{ fill: 'rgb(100 116 139 / var(--tw-text-opacity))', fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: 'rgb(100 116 139 / var(--tw-text-opacity))', fontSize: 12 }} />
                    <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                        formatter={(value) => [`${value} ${selectedMetric.unit}`, selectedMetric.name]}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', borderRadius: '0.5rem' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="value" name={selectedMetric.name} strokeWidth={2} stroke="#06b6d4" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
                </ResponsiveContainer>
            </div>
            </Card>
        ) : (
            <Card className="text-center p-6">
                <TrendingUp size={32} className="mx-auto text-primary mb-2" />
                <p className="text-neutral-dark dark:text-white font-medium">Nenhum dado registrado para "{selectedMetric?.name || 'esta métrica'}".</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Comece registrando um novo valor para visualizar o gráfico.</p>
                {selectedMetric && <Button size="sm" variant="primary" className="mt-3" onClick={() => handleLogMetric(selectedMetric)}>Registrar Primeiro Valor</Button>}
            </Card>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4">
            Análise Corporal (Simulada)
        </h2>
        <Card>
             <h3 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4">Histórico de Body Scans</h3>
             {bodyScans.length > 0 ? (
                <>
                <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bodyScans} margin={{ top: 5, right: 20, left: -5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('pt-BR', {month:'short', day:'numeric'})} tick={{ fill: 'rgb(100 116 139 / var(--tw-text-opacity))', fontSize: 11 }}/>
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fill: '#8884d8', fontSize: 11 }} domain={['auto', 'auto']} />
                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fill: '#82ca9d', fontSize: 11 }} domain={['auto', 'auto']}/>
                            <Tooltip 
                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', borderRadius: '0.5rem' }}/>
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar yAxisId="left" dataKey="weightKg" name="Peso (kg)" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={15} />
                            <Bar yAxisId="right" dataKey="bodyFatPercentage" name="% Gordura" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={15}/>
                            <Bar yAxisId="left" dataKey="muscleMassKg" name="Massa Musc. (kg)" fill="#ffc658" radius={[4, 4, 0, 0]} barSize={15}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {bodyScans.map(scan => (
                        <li key={scan.date} className="text-xs p-2 bg-slate-50 dark:bg-slate-700/50 rounded flex justify-between items-center">
                           <span>{new Date(scan.date).toLocaleDateString('pt-BR')}: P: {scan.weightKg || '-'}kg, %G: {scan.bodyFatPercentage || '-'}%, MM: {scan.muscleMassKg || '-'}kg</span>
                           <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 !p-1" onClick={() => handleDeleteBodyScan(scan.date)}><Trash2 size={14}/></Button>
                        </li>
                    ))}
                </ul>
                </>
             ) : (
                <p className="text-neutral-DEFAULT dark:text-slate-300 py-4 text-center">Nenhum body scan registrado.</p>
             )}
             {bodyScans.length > 0 && (bodyScanAnalysis || isAnalyzing) && (
                 <Card className="mt-4 bg-primary-light/10 dark:bg-primary-dark/20">
                     <h4 className="text-lg font-semibold text-primary dark:text-primary-light mb-2">Análise IA do Último Scan ({new Date(bodyScans[bodyScans.length -1].date).toLocaleDateString('pt-BR')}):</h4>
                     {isAnalyzing ? <LoadingSpinner /> : <p className="text-neutral-dark dark:text-white whitespace-pre-line">{bodyScanAnalysis}</p>}
                 </Card>
             )}
        </Card>
      </section>

      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title={`Registrar ${metricToLog?.name}`}>
        <div className="space-y-4">
          <Input 
            label="Data" 
            type="date" 
            value={logDate} 
            onChange={(e) => setLogDate(e.target.value)} 
          />
          <Input 
            label={`Valor (${metricToLog?.unit})`}
            type="number" 
            value={logValue} 
            onChange={(e) => setLogValue(e.target.value)} 
            placeholder={`Novo valor para ${metricToLog?.name}`}
            required
            step="any"
          />
          <Button onClick={submitLog} className="w-full">Salvar Registro</Button>
        </div>
      </Modal>

      <Modal isOpen={isBodyScanModalOpen} onClose={() => {setIsBodyScanModalOpen(false); setBodyScanAnalysis(null);}} title="Simulador de Body Scan IA" size="lg">
        <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Insira seus dados mais recentes. A IA fornecerá uma análise (simulada).</p>
            <Input label="Data do Scan" type="date" name="date" value={bodyScanInput.date || ''} onChange={handleBodyScanInputChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Peso (kg)" type="number" name="weightKg" value={bodyScanInput.weightKg || ''} onChange={handleBodyScanInputChange} step="any" placeholder="Ex: 75.5"/>
                <Input label="Altura (cm)" type="number" name="heightCm" value={bodyScanInput.heightCm || ''} onChange={handleBodyScanInputChange} placeholder="Ex: 175" step="any"/>
                <Input label="% Gordura Corporal" type="number" name="bodyFatPercentage" value={bodyScanInput.bodyFatPercentage || ''} onChange={handleBodyScanInputChange} step="any" placeholder="Ex: 22.3"/>
                <Input label="Massa Muscular (kg)" type="number" name="muscleMassKg" value={bodyScanInput.muscleMassKg || ''} onChange={handleBodyScanInputChange} step="any" placeholder="Ex: 35.0"/>
                <Input label="Idade (anos)" type="number" name="age" value={bodyScanInput.age || ''} onChange={handleBodyScanInputChange} placeholder="Ex: 30"/>
                <Select label="Gênero" name="gender" options={genderOptions} value={bodyScanInput.gender || ''} onChange={handleBodyScanInputChange} placeholder="Selecione o gênero"/>
            </div>
            <Select label="Nível de Atividade Física" name="activityLevel" options={activityLevelOptions} value={bodyScanInput.activityLevel || ''} onChange={handleBodyScanInputChange} placeholder="Selecione o nível de atividade"/>
            
            {isAnalyzing && <div className="py-4"><LoadingSpinner /></div>}
            {bodyScanAnalysis && !isAnalyzing && (
                 <Card className="mt-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500">
                     <h4 className="text-md font-semibold text-green-700 dark:text-green-300 mb-2">Análise da IA:</h4>
                     <p className="text-sm text-neutral-dark dark:text-neutral-light whitespace-pre-line">{bodyScanAnalysis}</p>
                 </Card>
            )}
            <Button onClick={submitBodyScan} className="w-full" isLoading={isAnalyzing} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analisando...' : 'Salvar Scan e Analisar com IA'}
            </Button>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default DashboardProgress;
