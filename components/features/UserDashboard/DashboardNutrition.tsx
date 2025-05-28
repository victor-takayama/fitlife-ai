
import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import NutritionPlanner from './NutritionPlanner';
import { NutritionPlan } from '../../../types';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { Apple, ListChecks, PlusCircle, History, BookOpen, Trash2 } from 'lucide-react';
import LoadingSpinner from '../../ui/LoadingSpinner';
import Input from '../../ui/Input'; 
import { useToasts, ToastType } from '../../ui/Toast';
import { AuthContext, AuthContextType } from '../../../contexts/AuthContext';
import { loadFromLocalStorage, saveToLocalStorage } from '../../../localStorageUtils';

const NUTRITION_CURRENT_PLAN_KEY = 'nutrition_current_plan';
const NUTRITION_SAVED_PLANS_KEY = 'nutrition_saved_plans';
const FOOD_LOG_KEY = 'food_log';

interface FoodLogEntry {
    id: string;
    name: string;
    calories: number;
    time: string;
    date: string; // YYYY-MM-DD for grouping by day
}

const FoodLogItem: React.FC<{item: FoodLogEntry, onRemove: (id: string) => void}> = ({item, onRemove}) => (
    <li className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-md hover:shadow-sm transition-shadow">
        <div>
            <p className="font-medium text-sm text-neutral-dark dark:text-white">{item.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.time}</p>
        </div>
        <div className="flex items-center space-x-2">
            <p className="text-sm text-primary dark:text-primary-light">{item.calories} kcal</p>
            <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="text-red-500 hover:bg-red-500/10" aria-label="Remover item do log">
                <Trash2 size={16} />
            </Button>
        </div>
    </li>
);

const DashboardNutrition: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [currentPlan, setCurrentPlan] = useState<NutritionPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<NutritionPlan[]>([]);
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([]);
  
  const [view, setView] = useState<'current' | 'generate' | 'history' | 'log'>('generate');
  const [isLoadingData, setIsLoadingData] = useState(true); // Combined loading state
  const { addToast } = useToasts();

  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const location = useLocation();

  // Load data from localStorage
  useEffect(() => {
    if (user) {
      const loadedCurrentPlan = loadFromLocalStorage<NutritionPlan>(NUTRITION_CURRENT_PLAN_KEY, user.id);
      const loadedSavedPlans = loadFromLocalStorage<NutritionPlan[]>(NUTRITION_SAVED_PLANS_KEY, user.id);
      const loadedFoodLog = loadFromLocalStorage<FoodLogEntry[]>(FOOD_LOG_KEY, user.id);

      if (loadedCurrentPlan) setCurrentPlan(loadedCurrentPlan);
      if (loadedSavedPlans) setSavedPlans(loadedSavedPlans);
      if (loadedFoodLog) setFoodLog(loadedFoodLog);
    }
    setIsLoadingData(false);
  }, [user]);

  // Save data to localStorage
  useEffect(() => {
    if (user && !isLoadingData) {
      saveToLocalStorage(NUTRITION_CURRENT_PLAN_KEY, currentPlan, user.id);
    }
  }, [currentPlan, user, isLoadingData]);

  useEffect(() => {
    if (user && !isLoadingData) {
      saveToLocalStorage(NUTRITION_SAVED_PLANS_KEY, savedPlans, user.id);
    }
  }, [savedPlans, user, isLoadingData]);

  useEffect(() => {
    if (user && !isLoadingData) {
      saveToLocalStorage(FOOD_LOG_KEY, foodLog, user.id);
    }
  }, [foodLog, user, isLoadingData]);

  // View logic based on URL params and data state
  useEffect(() => {
    if (isLoadingData) return; // Don't change view while loading

    const params = new URLSearchParams(location.search);
    const action = params.get('action');

    if (action === 'generate_plan') {
      setView('generate');
    } else if (action === 'log_meal') {
      setView('log');
    } else {
      if (currentPlan) {
        setView('current');
      } else if (savedPlans.length > 0) {
        setView('history');
      } else {
        setView('generate');
      }
    }
  }, [location.search, currentPlan, savedPlans, isLoadingData]);


  const handlePlanGenerated = (plan: NutritionPlan) => {
    const newPlan = { ...plan, id: `nutrition-${Date.now()}` };
    setCurrentPlan(newPlan);
    setSavedPlans(prev => [newPlan, ...prev.filter(p => p.id !== newPlan.id)]);
    setView('current');
    addToast("Plano nutricional gerado e salvo!", ToastType.Success);
  };

  const handleSelectPlanFromHistory = (plan: NutritionPlan) => {
    setIsLoadingData(true); // Simulate loading
    setTimeout(() => {
        setCurrentPlan(plan);
        setView('current');
        setIsLoadingData(false);
        addToast(`Plano "${plan.name}" carregado.`, ToastType.Info);
    }, 300);
  };

  const handleDeletePlanFromHistory = (planId: string) => {
    setSavedPlans(prev => prev.filter(p => p.id !== planId));
    if (currentPlan && currentPlan.id === planId) {
        setCurrentPlan(null);
        setView('generate'); // or 'history'
    }
    addToast("Plano nutricional removido do histórico.", ToastType.Info);
  };


  const handleLogFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        addToast("Você precisa estar logado para registrar refeições.", ToastType.Error);
        return;
    }
    if (foodName && foodCalories) {
        const caloriesNum = parseInt(foodCalories);
        if (isNaN(caloriesNum) || caloriesNum <= 0) {
            addToast("Por favor, insira um valor válido de calorias.", ToastType.Warning);
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const newLogEntry: FoodLogEntry = {
            id: Date.now().toString(),
            name: foodName,
            calories: caloriesNum,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
            date: today,
        };
        setFoodLog(prev => [newLogEntry, ...prev]);
        setFoodName('');
        setFoodCalories('');
        addToast(`Refeição "${newLogEntry.name}" (${newLogEntry.calories} kcal) registrada!`, ToastType.Success);
    } else {
        addToast("Preencha o nome e as calorias da refeição.", ToastType.Warning);
    }
  };

  const removeFoodLogItem = (id: string) => {
    setFoodLog(prev => prev.filter(item => item.id !== id));
    addToast("Item removido do registro.", ToastType.Info);
  };
  
  const todayFoodLog = foodLog.filter(item => item.date === new Date().toISOString().split('T')[0]);
  const totalCaloriesToday = todayFoodLog.reduce((sum, item) => sum + item.calories, 0);

  const renderContent = () => {
    if (isLoadingData && !user) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
    }
    if (!user) {
        return (
             <Card className="text-center p-8">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-3">Acesso Restrito</h3>
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">Por favor, faça login para acessar seu painel de nutrição.</p>
            </Card>
        );
    }

    if (view === 'generate') {
      return <NutritionPlanner currentPlan={null} onPlanGenerated={handlePlanGenerated} viewGenerator={() => setView('generate')} />;
    }
    if (view === 'current' && currentPlan) {
      return <NutritionPlanner currentPlan={currentPlan} onPlanGenerated={handlePlanGenerated} viewGenerator={() => { setView('generate'); setCurrentPlan(null);}} />;
    }
     if (view === 'log') {
        return (
            <Card>
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4 flex items-center">
                    <BookOpen size={22} className="mr-2 text-secondary"/> Registrar Consumo Alimentar
                </h3>
                <form onSubmit={handleLogFood} className="space-y-4 mb-6">
                    <Input label="Nome do Alimento/Refeição" value={foodName} onChange={e => setFoodName(e.target.value)} required />
                    <Input label="Calorias (kcal)" type="number" value={foodCalories} onChange={e => setFoodCalories(e.target.value)} required min="1"/>
                    <Button type="submit" variant="secondary" leftIcon={PlusCircle} disabled={!user}>Registrar Refeição</Button>
                </form>
                <h4 className="text-lg font-medium text-neutral-dark dark:text-white mb-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    Refeições Registradas Hoje ({totalCaloriesToday} kcal)
                </h4>
                {todayFoodLog.length > 0 ? (
                    <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {todayFoodLog.map(item => <FoodLogItem key={item.id} item={item} onRemove={removeFoodLogItem} />)}
                    </ul>
                ) : (
                    <p className="text-neutral-DEFAULT dark:text-slate-300">Nenhuma refeição registrada ainda hoje.</p>
                )}
            </Card>
        );
    }
    if (view === 'history') {
      return (
        <Card>
          <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4 flex items-center">
            <History size={22} className="mr-2 text-secondary"/> Histórico de Planos Nutricionais
            </h3>
          {savedPlans.length > 0 ? (
            <ul className="space-y-3">
              {savedPlans.map(plan => (
                <li key={plan.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-sm transition-shadow">
                  <div className="mb-2 sm:mb-0">
                    <p className="font-medium text-neutral-dark dark:text-white">{plan.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">~{plan.dailyCalorieTarget} kcal/dia. Dias: {plan.days.length}.</p>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-center">
                    <Button variant="outline" size="sm" className="border-secondary text-secondary hover:bg-secondary/10" onClick={() => handleSelectPlanFromHistory(plan)}>Carregar</Button>
                     <Button variant="ghost" size="icon" onClick={() => handleDeletePlanFromHistory(plan.id)} className="text-red-500 hover:bg-red-500/10" aria-label="Remover plano">
                        <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-3">Você ainda não tem planos nutricionais salvos.</p>
                <Button onClick={() => setView('generate')} leftIcon={PlusCircle} variant='secondary'>Gerar seu Primeiro Plano</Button>
            </div>
          )}
        </Card>
      );
    }
    if (view === 'current' && !currentPlan) {
        return (
             <Card className="text-center p-8">
                <Apple size={40} className="mx-auto mb-3 text-secondary" />
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-3">Nenhum plano nutricional ativo.</h3>
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">Gere um novo plano personalizado com nossa IA ou carregue um de seus planos salvos.</p>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button onClick={() => {setView('generate');}} leftIcon={PlusCircle} variant="secondary">Gerar Novo Plano</Button>
                    {savedPlans.length > 0 && 
                        <Button onClick={() => setView('history')} leftIcon={History} variant="outline">Ver Histórico</Button>
                    }
                </div>
            </Card>
        );
    }
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  };
  
  const getButtonClass = (buttonView: typeof view) => {
    return view === buttonView ? 'secondary' : 'ghost';
  };
  const getButtonExtraClass = (buttonView: typeof view) => {
    return view !== buttonView ? "text-secondary hover:border-secondary hover:bg-secondary/10" : "";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
        <Button 
            variant={getButtonClass('current')}
            onClick={() => setView('current')}
            leftIcon={ListChecks}
            className={getButtonExtraClass('current')}
            disabled={!user || isLoadingData}
        >
            Plano Atual
        </Button>
         <Button 
            variant={getButtonClass('generate')}
            onClick={() => {setView('generate');}}
            leftIcon={PlusCircle}
            className={getButtonExtraClass('generate')}
            disabled={!user || isLoadingData}
        >
            Gerar Novo
        </Button>
        <Button 
            variant={getButtonClass('log')} 
            onClick={() => setView('log')}
            leftIcon={BookOpen}
            className={getButtonExtraClass('log')}
            disabled={!user || isLoadingData}
        >
            Registrar Refeição
        </Button>
        <Button 
            variant={getButtonClass('history')} 
            onClick={() => setView('history')}
            leftIcon={History}
            className={getButtonExtraClass('history')}
            disabled={!user || isLoadingData}
        >
            Histórico ({savedPlans.length})
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default DashboardNutrition;
