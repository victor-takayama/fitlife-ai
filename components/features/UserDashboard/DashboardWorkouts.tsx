
import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import WorkoutGeneratorForm from './WorkoutGeneratorForm';
import WorkoutDisplay from './WorkoutDisplay';
import { WorkoutPlan, FitnessLevel } from '../../../types'; // Added FitnessLevel
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { ListChecks, PlusCircle, History, Trash2 } from 'lucide-react';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { useToasts, ToastType } from '../../ui/Toast'; 
import { AuthContext, AuthContextType } from '../../../contexts/AuthContext';
import { loadFromLocalStorage, saveToLocalStorage } from '../../../localStorageUtils';

const WORKOUT_CURRENT_PLAN_KEY = 'workout_current_plan';
const WORKOUT_SAVED_PLANS_KEY = 'workout_saved_plans';

const DashboardWorkouts: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<WorkoutPlan[]>([]);
  const [view, setView] = useState<'generate' | 'current' | 'history'>('generate'); 
  const [isLoadingPlan, setIsLoadingPlan] = useState(true); // Start true to load from localStorage
  const { addToast } = useToasts();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const loadedCurrentPlan = loadFromLocalStorage<WorkoutPlan>(WORKOUT_CURRENT_PLAN_KEY, user.id);
      const loadedSavedPlans = loadFromLocalStorage<WorkoutPlan[]>(WORKOUT_SAVED_PLANS_KEY, user.id);
      
      if (loadedCurrentPlan) setCurrentPlan(loadedCurrentPlan);
      if (loadedSavedPlans) setSavedPlans(loadedSavedPlans);
    }
    setIsLoadingPlan(false);
  }, [user]);

  useEffect(() => {
    if (user && !isLoadingPlan) { // Only save if not initially loading and user is present
      saveToLocalStorage(WORKOUT_CURRENT_PLAN_KEY, currentPlan, user.id);
    }
  }, [currentPlan, user, isLoadingPlan]);

  useEffect(() => {
    if (user && !isLoadingPlan) {
      saveToLocalStorage(WORKOUT_SAVED_PLANS_KEY, savedPlans, user.id);
    }
  }, [savedPlans, user, isLoadingPlan]);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');

    if (isLoadingPlan) return; // Don't change view while loading initial data

    if (action === 'generate') {
      setView('generate');
      // setCurrentPlan(null); // Don't nullify if we want to keep it while generating another
    } else {
      if (currentPlan) {
        setView('current');
      } else if (savedPlans.length > 0) {
        setView('history'); 
      } else {
        setView('generate');
      }
    }
  }, [location.search, currentPlan, savedPlans, isLoadingPlan]);


  const handlePlanGenerated = (plan: WorkoutPlan) => {
    const newPlan = { ...plan, id: `workout-${Date.now()}` }; // Ensure unique ID
    setCurrentPlan(newPlan);
    setSavedPlans(prev => {
        // Prevent duplicates by name if desired, or just add
        const existingByName = prev.find(p => p.name === newPlan.name);
        if (existingByName) { // Optionally update if name matches or just add new
            // For now, let's add as new, IDs should be unique.
        }
        return [newPlan, ...prev.filter(p => p.id !== newPlan.id)]; 
    });
    setView('current');
    addToast("Plano de treino gerado e salvo com sucesso!", ToastType.Success);
  };

  const handleSelectPlanFromHistory = (plan: WorkoutPlan) => {
    setIsLoadingPlan(true);
    setTimeout(() => {
        setCurrentPlan(plan);
        setView('current');
        setIsLoadingPlan(false);
        addToast(`Plano "${plan.name}" carregado.`, ToastType.Info);
    }, 300);
  };

  const handleDeletePlanFromHistory = (planId: string) => {
    setSavedPlans(prev => prev.filter(p => p.id !== planId));
    if (currentPlan && currentPlan.id === planId) {
        setCurrentPlan(null);
        setView('generate'); // or 'history' if other plans exist
    }
    addToast("Plano removido do histórico.", ToastType.Info);
  };

  const renderContent = () => {
    if (isLoadingPlan && !user) { // Show spinner only if loading and no user yet (initial app load)
        return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
    }
     if (!user) {
        return (
            <Card className="text-center p-8">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-3">Acesso Restrito</h3>
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">Por favor, faça login para acessar seus planos de treino.</p>
                {/* Link to login can be added here */}
            </Card>
        );
    }


    if (view === 'generate') {
      return <WorkoutGeneratorForm onPlanGenerated={handlePlanGenerated} />;
    }
    if (view === 'current' && currentPlan) {
      return <WorkoutDisplay plan={currentPlan} />;
    }
    if (view === 'current' && !currentPlan) {
        return (
            <Card className="text-center p-8">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-3">Nenhum plano de treino ativo.</h3>
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">Gere um novo plano personalizado com nossa IA ou carregue um de seus planos salvos.</p>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button onClick={() => {setView('generate');}} leftIcon={PlusCircle}>Gerar Novo Plano</Button>
                    {savedPlans.length > 0 && 
                        <Button onClick={() => setView('history')} leftIcon={History} variant="outline">Ver Histórico</Button>
                    }
                </div>
            </Card>
        );
    }
    if (view === 'history') {
      return (
        <Card>
          <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4 flex items-center">
            <History size={22} className="mr-2 text-primary"/> Histórico de Planos de Treino
            </h3>
          {savedPlans.length > 0 ? (
            <ul className="space-y-3">
              {savedPlans.map(plan => (
                <li key={plan.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-sm transition-shadow">
                  <div className="mb-2 sm:mb-0">
                    <p className="font-medium text-neutral-dark dark:text-white">{plan.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan.fitnessLevel} - {plan.goals.join(', ')}. Dias: {plan.days.length}.</p>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-center">
                    <Button variant="outline" size="sm" onClick={() => handleSelectPlanFromHistory(plan)}>Carregar</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePlanFromHistory(plan.id)} className="text-red-500 hover:bg-red-500/10" aria-label="Remover plano">
                        <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-3">Você ainda não tem planos de treino salvos.</p>
                <Button onClick={() => setView('generate')} leftIcon={PlusCircle} variant='primary'>Gerar seu Primeiro Plano</Button>
            </div>
          )}
        </Card>
      );
    }
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>; // Fallback while determining view
  };
  
  const getButtonClass = (buttonView: typeof view) => {
    return view === buttonView ? 'primary' : 'ghost';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
        <Button 
            variant={getButtonClass('current')}
            onClick={() => setView('current')}
            leftIcon={ListChecks}
            disabled={!user || isLoadingPlan}
        >
            Plano Atual
        </Button>
        <Button 
            variant={getButtonClass('generate')}
            onClick={() => {setView('generate');}}
            leftIcon={PlusCircle}
            disabled={!user || isLoadingPlan}
        >
            Gerar Novo Plano
        </Button>
        <Button 
            variant={getButtonClass('history')}
            onClick={() => setView('history')}
            leftIcon={History}
            disabled={!user || isLoadingPlan}
        >
            Histórico ({savedPlans.length})
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default DashboardWorkouts;
