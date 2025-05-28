
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, AuthContextType } from '../../../contexts/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { Activity, Apple, BarChart3, ChevronRight, Dumbbell, MessageSquareHeart, Sparkles, User, Bot } from 'lucide-react'; 
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { getMotivationalMessage, generateGeneralContent } from '../../../services/geminiService';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WorkoutPlan, NutritionPlan } from '../../../types';
import { loadFromLocalStorage } from '../../../localStorageUtils';

const WORKOUT_CURRENT_PLAN_KEY = 'workout_current_plan';
const NUTRITION_CURRENT_PLAN_KEY = 'nutrition_current_plan';


const mockProgressData = [
  { name: 'Sem 1', treinos: 2, humor: 3, calorias: 2200 },
  { name: 'Sem 2', treinos: 3, humor: 4, calorias: 2100 },
  { name: 'Sem 3', treinos: 3, humor: 3, calorias: 2000 },
  { name: 'Sem 4', treinos: 4, humor: 5, calorias: 1950 },
];


const DashboardOverview: React.FC = () => {
  const { user } = useContext(AuthContext) as AuthContextType;
  const [motivationalQuote, setMotivationalQuote] = useState<string>('');
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(true);
  
  const [nextWorkoutSuggestion, setNextWorkoutSuggestion] = useState<{ name: string; time?: string; source: 'plan' | 'ai_generic' } | null>(null);
  const [nextMealSuggestion, setNextMealSuggestion] = useState<{ name: string; type?: string; source: 'plan' | 'ai_generic' } | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  const userWorkoutPlan = user ? loadFromLocalStorage<WorkoutPlan>(WORKOUT_CURRENT_PLAN_KEY, user.id) : null;
  const userNutritionPlan = user ? loadFromLocalStorage<NutritionPlan>(NUTRITION_CURRENT_PLAN_KEY, user.id) : null;

  useEffect(() => {
    const fetchQuote = async () => {
      setIsLoadingQuote(true);
      const quote = await getMotivationalMessage();
      setMotivationalQuote(quote);
      setIsLoadingQuote(false);
    };
    fetchQuote();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setIsLoadingSuggestions(false);
        setNextWorkoutSuggestion({ name: "Descubra treinos personalizados!", source: 'ai_generic' });
        setNextMealSuggestion({ name: "Explore planos nutricionais com IA!", source: 'ai_generic' });
        return;
      }
      setIsLoadingSuggestions(true);

      // Workout Suggestion
      if (userWorkoutPlan && userWorkoutPlan.days.length > 0) {
        // Simple: suggest first exercise of the first day, or more complex logic
        const firstDay = userWorkoutPlan.days[0];
        setNextWorkoutSuggestion({ 
            name: `Do seu plano: ${firstDay.focus} - ${firstDay.exercises[0]?.name || 'Revisar plano'}`, 
            time: "Verifique seu plano", 
            source: 'plan' 
        });
      } else {
        const workoutPrompt = `Sugira um tipo de treino rápido e eficaz que um usuário ${user.fitnessLevel || 'iniciante'} pode fazer hoje em ${user.timePerSession || 30} minutos. Responda com o nome do treino ou foco. Max 10 palavras.`;
        const aiWorkout = await generateGeneralContent(workoutPrompt);
        setNextWorkoutSuggestion({ name: aiWorkout || "Experimente um novo treino com IA!", source: 'ai_generic' });
      }

      // Meal Suggestion
      if (userNutritionPlan && userNutritionPlan.days.length > 0) {
        const firstMeal = userNutritionPlan.days[0]?.meals.lunch || userNutritionPlan.days[0]?.meals.breakfast;
        setNextMealSuggestion({ 
            name: `Do seu plano: ${firstMeal?.name || 'Revisar plano'}`, 
            type: firstMeal ? (userNutritionPlan.days[0]?.meals.lunch ? "Almoço" : "Café da Manhã") : "Verifique seu plano",
            source: 'plan' 
        });
      } else {
        const mealGoal = user.goals?.find(g => g.toLowerCase().includes('peso') || g.toLowerCase().includes('massa') || g.toLowerCase().includes('nutrição')) || 'uma alimentação equilibrada';
        const mealPrompt = `Sugira uma refeição saudável e fácil (almoço ou jantar) para alguém que busca ${mealGoal}. Nome da refeição apenas. Max 10 palavras.`;
        const aiMeal = await generateGeneralContent(mealPrompt);
        setNextMealSuggestion({ name: aiMeal || "Peça uma sugestão de refeição à IA!", type: "Dica da IA", source: 'ai_generic' });
      }
      setIsLoadingSuggestions(false);
    };
    fetchSuggestions();
  }, [user, userWorkoutPlan, userNutritionPlan]); // Rerun if user or their plans change

  if (!user && !isLoadingQuote && !isLoadingSuggestions) {
     return (
        <div className="space-y-8">
             <section>
                <h2 className="text-2xl font-semibold text-neutral-dark dark:text-white mb-1">
                Bem-vindo ao FitLife AI!
                </h2>
                <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">
                Faça login ou crie sua conta para uma experiência personalizada.
                </p>
                 <Card className="bg-gradient-to-r from-primary to-sky-600 text-white p-6 shadow-lg">
                    <div className="flex items-center space-x-3 mb-2">
                        <Sparkles size={24} />
                        <h3 className="text-lg font-semibold">Dica Motivacional:</h3>
                    </div>
                    {isLoadingQuote ? <LoadingSpinner size="sm" color="text-white" /> : <p className="italic">"{motivationalQuote}"</p>}
                </Card>
            </section>
            <section className="text-center">
                <p className="text-lg text-neutral-dark dark:text-white mb-4">Transforme sua saúde com planos de treino e nutrição personalizados por Inteligência Artificial.</p>
                <Link to={ROUTES.REGISTER}>
                    <Button variant="primary" size="lg">Comece Agora Gratuitamente</Button>
                </Link>
            </section>
        </div>
     );
  }
  
  if (!user && (isLoadingQuote || isLoadingSuggestions)) {
     return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg" /></div>;
  }
  
  // Ensure user is not null if we reach here
  if (!user) return null;


  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-neutral-dark dark:text-white mb-1">
          Olá, {user.name}!
        </h2>
        <p className="text-neutral-DEFAULT dark:text-slate-300 mb-6">
          Pronto para mais um dia de conquistas com FitLife AI?
        </p>
        <Card className="bg-gradient-to-r from-primary to-sky-600 text-white p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles size={24} />
            <h3 className="text-lg font-semibold">Dica Motivacional do Dia:</h3>
          </div>
          {isLoadingQuote ? <LoadingSpinner size="sm" color="text-white" /> : <p className="italic">"{motivationalQuote}"</p>}
        </Card>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-neutral-dark dark:text-white mb-3 flex items-center">
            <Dumbbell size={20} className="mr-2 text-primary" /> Próximo Treino
          </h3>
          {isLoadingSuggestions ? <LoadingSpinner size="sm"/> : nextWorkoutSuggestion ? (
            <>
              <p className="text-neutral-DEFAULT dark:text-slate-300 font-medium">{nextWorkoutSuggestion.name}</p>
              {nextWorkoutSuggestion.time && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{nextWorkoutSuggestion.time}</p>}
            </>
          ) : <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Nenhuma sugestão no momento.</p>}
          <Link to={ROUTES.DASHBOARD_WORKOUTS}>
            <Button variant="outline" size="sm" rightIcon={ChevronRight} className="mt-2">
                {userWorkoutPlan ? "Ver Meus Treinos" : "Gerar Treino"}
            </Button>
          </Link>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-neutral-dark dark:text-white mb-3 flex items-center">
            <Apple size={20} className="mr-2 text-secondary" /> Sugestão de Refeição
          </h3>
          {isLoadingSuggestions ? <LoadingSpinner size="sm"/> : nextMealSuggestion ? (
            <>
              <p className="text-neutral-DEFAULT dark:text-slate-300 font-medium">{nextMealSuggestion.name}</p>
              {nextMealSuggestion.type && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{nextMealSuggestion.type}</p>}
            </>
          ) : <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Nenhuma sugestão no momento.</p>}
          <Link to={ROUTES.DASHBOARD_NUTRITION}>
            <Button variant="outline" size="sm" rightIcon={ChevronRight} className="border-secondary text-secondary hover:bg-secondary/10 mt-2">
                {userNutritionPlan ? "Ver Plano Nutricional" : "Gerar Plano"}
            </Button>
          </Link>
        </Card>
        
        <Card className="md:col-span-2 lg:col-span-1">
          <h3 className="text-lg font-semibold text-neutral-dark dark:text-white mb-3 flex items-center">
            <Bot size={20} className="mr-2 text-accent" /> Fale com seu Coach IA
          </h3>
          <p className="text-sm text-neutral-DEFAULT dark:text-slate-300 mb-3">Precisa de ajustes no plano, dicas ou motivação? Seu coach IA está aqui!</p>
          {/* This button could open a modal with ChatbotInterface or navigate to a dedicated chat page */}
          <Button variant="accent" size="sm" onClick={() => alert("Simulação: Abrindo chat com Coach IA...")}>
            Iniciar Chat
          </Button>
        </Card>
      </section>
      
      <section>
        <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4 flex items-center">
            <BarChart3 size={22} className="mr-2 text-primary" /> Resumo Semanal (Simulado)
        </h3>
        <Card>
            <div className="h-72 md:h-96"> 
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockProgressData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fill: 'rgb(100 116 139 / var(--tw-text-opacity))', fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fill: 'rgb(100 116 139 / var(--tw-text-opacity))', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgb(100 116 139 / var(--tw-text-opacity))', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                            backdropFilter: 'blur(5px)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem',
                            color: '#334155'
                        }}
                        itemStyle={{ color: '#334155' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="treinos" name="Treinos Completos" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="left" type="monotone" dataKey="humor" name="Nível de Humor (1-5)" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="calorias" name="Média Calorias/Dia" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
            </div>
        </Card>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link to={`${ROUTES.DASHBOARD_WORKOUTS}?action=generate`}>
                <Card className="text-center hover:shadow-primary/20 dark:hover:shadow-primary-dark/20 p-4 transition-shadow">
                    <Activity size={28} className="mx-auto mb-2 text-primary"/>
                    <p className="font-medium text-sm text-neutral-dark dark:text-white">Gerar Novo Treino</p>
                </Card>
            </Link>
            <Link to={`${ROUTES.DASHBOARD_NUTRITION}?action=log_meal`}>
                <Card className="text-center hover:shadow-secondary/20 dark:hover:shadow-secondary-dark/20 p-4 transition-shadow">
                    <Apple size={28} className="mx-auto mb-2 text-secondary"/>
                    <p className="font-medium text-sm text-neutral-dark dark:text-white">Registrar Refeição</p>
                </Card>
            </Link>
             <Link to={ROUTES.DASHBOARD_PROGRESS}>
                <Card className="text-center hover:shadow-accent/20 dark:hover:shadow-accent-dark/20 p-4 transition-shadow">
                    <BarChart3 size={28} className="mx-auto mb-2 text-accent"/>
                    <p className="font-medium text-sm text-neutral-dark dark:text-white">Ver Progresso</p>
                </Card>
            </Link>
             <Link to={ROUTES.DASHBOARD_PROFILE}>
                <Card className="text-center hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20 p-4 transition-shadow">
                    <User size={28} className="mx-auto mb-2 text-purple-500 dark:text-purple-400"/>
                    <p className="font-medium text-sm text-neutral-dark dark:text-white">Meu Perfil</p>
                </Card>
            </Link>
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
